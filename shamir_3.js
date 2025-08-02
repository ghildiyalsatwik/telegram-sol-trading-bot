import express from 'express'
import pkg from 'pg'
import 'dotenv/config'

const { Pool } = pkg

const app = express()

app.use(express.json())

const PORT = process.env.SHAMIR_3_PORT

const pool = new Pool({ connectionString: process.env.db4 })

app.post('/register', async (req, res) => {

    const { user_id, share } = req.body
    
    await pool.query('INSERT INTO users (user_id, shamir_share) VALUES ($1, $2);', [user_id, share])

    res.sendStatus(200)

})


app.get('/get', async (req, res) => {

    const { user_id } = req.body
    
    const result = await pool.query('SELECT shamir_share from users where user_id = $1', [user_id])

    res.json({ share: result.rows[0].shamir_share })


})

app.listen(PORT, () => {

    console.log(`Shamere3 server running on PORT: ${PORT}`)
})

