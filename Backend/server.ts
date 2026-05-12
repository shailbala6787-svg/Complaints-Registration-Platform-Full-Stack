import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { db } from './db';
import { users, complaints } from './schema';
import { eq, and } from 'drizzle-orm';
import { sendOTPEmail } from './mailer';
import { generateFollowUpQuestion } from './ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

app.get('/api/test-db', async (req: Request, res: Response) => {
  try {
    const result = await db.execute('SELECT 1');
    res.json({ message: 'Database connection successful', result });
  } catch (err) {
    console.error('DB Test Error:', err);
    res.status(500).json({ error: 'Database connection failed', details: err });
  }
});

const frontendPort = process.env.FRONTEND_PORT || 5500;
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      `http://localhost:${frontendPort}`,
      `http://127.0.0.1:${frontendPort}`,
      /\.github\.io$/ // Allow any GitHub Pages domain
    ];
    
    if (!origin || allowedOrigins.some(ao => ao instanceof RegExp ? ao.test(origin) : ao === origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// --- Middleware ---

const authenticate = (req: Request, res: Response, next: NextFunction) => {
  let token = req.cookies.token;
  
  // Also check Authorization header
  if (!token && req.headers.authorization) {
    token = req.headers.authorization.split(' ')[1];
  }

  console.log('Auth check - Token exists:', !!token);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// --- Auth Routes ---

app.post('/api/auth/send-otp', async (req: Request, res: Response) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  try {
    const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
    
    if (existingUser) {
        if (existingUser.isVerified) {
            return res.status(400).json({ error: 'Email already registered and verified' });
        }
        // Update existing unverified user
        await db.update(users)
            .set({ name, otp, otpExpiry })
            .where(eq(users.email, email));
    } else {
        // Create new unverified user
        await db.insert(users).values({
            name,
            email,
            password: '', // Placeholder until register
            otp,
            otpExpiry,
            isVerified: false,
            role: 'user'
        });
    }

    // Send email in the background to avoid blocking the user response
    sendOTPEmail(email, otp).catch(err => console.error('Background Email Error:', err));
    
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('OTP Error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) return res.status(400).json({ error: 'All fields are required' });

  try {
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (user.otpExpiry && user.otpExpiry < new Date()) return res.status(400).json({ error: 'OTP expired' });

    await db.update(users)
      .set({ password, isVerified: true, otp: null, otpExpiry: null })
      .where(eq(users.email, email));

    res.json({ message: 'Registration successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user || !user.isVerified || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials or unverified account' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET);
    
    res.cookie('token', token, {
      httpOnly: false,
      secure: false, // Localhost par false hi hona chahiye
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ name: user.name, email: user.email, role: user.role, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', authenticate, (req: Request, res: Response) => {
  res.json((req as any).user);
});

// --- Complaint Routes ---

app.post('/api/ai/question', authenticate, async (req: Request, res: Response) => {
  const { complaint_text } = req.body;
  if (!complaint_text) return res.status(400).json({ error: 'Complaint text required' });

  try {
    const question = await generateFollowUpQuestion(complaint_text);
    res.json({ question });
  } catch (err) {
    console.error('AI Error (Fallback used):', err);
    res.json({ question: "Could you please provide any additional details that might help us resolve this faster?" });
  }
});

app.post('/api/complaints', authenticate, async (req: Request, res: Response) => {
  console.log('Incoming complaint submission:', req.body);
  const { complaint_text, ai_question, ai_answer } = req.body;
  const userId = (req as any).user.id;

  if (!complaint_text || !ai_question || !ai_answer) {
    return res.status(400).json({ error: 'All complaint fields are required' });
  }

  try {
    const [newComplaint] = await db.insert(complaints).values({
      userId,
      complaintText: complaint_text,
      aiQuestion: ai_question,
      userAnswer: ai_answer
    }).returning();

    res.json(newComplaint);
  } catch (err) {
    console.error('Complaint Submission Error:', err);
    res.status(500).json({ error: 'Failed to submit complaint' });
  }
});

app.get('/api/complaints/my', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  try {
    const myComplaints = await db.query.complaints.findMany({
      where: eq(complaints.userId, userId),
      orderBy: (complaints, { desc }) => [desc(complaints.createdAt)]
    });
    res.json(myComplaints);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// --- Admin Routes ---

app.get('/api/admin/complaints', authenticate, isAdmin, async (req: Request, res: Response) => {
  try {
    const allComplaints = await db.select({
        id: complaints.id,
        complaintText: complaints.complaintText,
        aiQuestion: complaints.aiQuestion,
        userAnswer: complaints.userAnswer,
        createdAt: complaints.createdAt,
        userName: users.name,
        userEmail: users.email
    })
    .from(complaints)
    .innerJoin(users, eq(complaints.userId, users.id))
    .orderBy(complaints.createdAt);

    res.json(allComplaints);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch all complaints' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
