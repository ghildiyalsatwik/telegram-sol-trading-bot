import express from 'express'
import pkg from 'pg'
import 'dotenv/config'

const { Pool } = pkg

const app = express()

app.use(express.json())

const PORT = process.env.SHAMIR_2_PORT

const pool = new Pool({ connectionString: process.env.db3 })

app.post('/register', async (req, res) => {

    const { user_id, share } = req.body
    
    await pool.query('INSERT INTO users (user_id, shamir_share) VALUES ($1, $2);', [user_id, share])

    res.sendStatus(200)

})

app.listen(PORT, () => {

    console.log(`Shamere2 server running on PORT: ${PORT}`)
})

