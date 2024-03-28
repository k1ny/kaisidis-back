const express = require('express')
const app = express()
const { z } = require('zod')
const nodemailer = require('nodemailer')
const rateLimit = require("express-rate-limit");

const HOST = process.env.HOST ?? 'localhost'
const PORT = process.env.PORT ?? 3000

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 3, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    // store: ... , // Redis, Memcached, etc. See below.
})

const validate = (schema) =>
    async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            return next();
        } catch (error) {
            return res.status(400).json(error);
        }
    };

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const requestSchema = z.object({
    body: z.object({
        email: z.string().email(),
        name: z.string().min(1).max(128),
        phone: z.string().length(11).regex(/^\d+$/)
    })
})

app.post(
    '/api/request',
    limiter,
    validate(requestSchema),
    async (req, res) => {
        const {name, phone, email} = req.body

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.TARGET_EMAIL,
            subject: 'Новая заявка',
            text: `Имя: ${name}, Email: ${email}, Телефон: ${phone}`
        })

        res.send({ success: true })
    }
)

app.listen(PORT, HOST, () => console.log(`server listening at http://${HOST}:${PORT}`))


