import 'dotenv/config'
import fetch from 'node-fetch'
import express from 'express'
import axios from 'axios'
import pkg from 'pg'
import { Keypair } from "@solana/web3.js"
import sss from 'shamirs-secret-sharing'

const { Pool } = pkg

const app = express()

app.use(express.json())

const pool = new Pool({connectionString: process.env.db1})

const PORT = process.env.PORT || 3000


app.post('/webhook', async (req, res) => {

    const msg = req.body.message

    const userId = msg.from.id

    const userMessage = msg.text

    const systemPrompt = process.env.systemPrompt

    const finalPrompt = `###System: ${systemPrompt} ###User : ${userMessage}`

    const llmResp = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama2',
          prompt: finalPrompt,
          stream: false
        
        })
    })

    const data = await llmResp.json()

    const llmOutput = data.response.trim()

    const intent = JSON.parse(llmOutput)

    if(intent.command === 'create_wallet') {

        const { rows } = await pool.query('SELECT pubkey FROM users where telegram_user_id = $1;', [userId])

        let reply;

        if(rows.length > 0) {

            reply = `You already have a walllet!\nPublic key: ${rows[0].pubkey}`
        
        } else {

            const kp = Keypair.generate()

            const secret = Buffer.from(kp.secretKey)

            const shares = sss.split(secret, {shares: 3, threshold: 2})

            await Promise.all([
                
                axios.post(process.env.SHAMERE1_URL, { user_id: userId, share: shares[0].toString('hex') }),
                
                axios.post(process.env.SHAMERE2_URL, { user_id: userId, share: shares[1].toString('hex') }),
                
                axios.post(process.env.SHAMERE3_URL, { user_id: userId, share: shares[2].toString('hex') })
            
            ])


            await pool.query('INSERT INTO USERS (telegram_user_id, pubkey) VALUES ($1, $2)', [userId, kp.publicKey.toBase58()])

            reply = `Wallet has been created\nPublic key: ${kp.publicKey.toBase58()}`
        
        }

        await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {chat_id: msg.chat.id, text: reply})

    }

    res.sendStatus(200)

})


app.listen(PORT, () => {

    console.log(`Main server running on PORT: ${PORT}`)
})