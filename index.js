import 'dotenv/config'
import fetch from 'node-fetch'
import express from 'express'
import axios from 'axios'
import pkg from 'pg'
import { Keypair, SystemProgram, Connection, LAMPORTS_PER_SOL, Transaction, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js"
import sss from 'shamirs-secret-sharing'

const { Pool } = pkg

const app = express()

app.use(express.json())

const pool = new Pool({connectionString: process.env.db1})

const PORT = process.env.PORT || 3000


function validSolanaAddress(address) {

    try {

        return PublicKey.isOnCurve(address.toBytes())


    } catch(e) {

        return false
    }
}


app.post('/webhook', async (req, res) => {

    const msg = req.body.message

    const userId = msg.from.id

    const userMessage = msg.text


    if (userMessage === '/start') {
        
        await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, { chat_id: msg.chat.id, text: "Welcome to the Solana bot! Type what you'd like to do." })
        
        return res.sendStatus(200);
    }

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

    let intent;

    try {

        intent = JSON.parse(llmOutput)
    
    } catch(e) {

        console.log('Could not parse the llm response as a JSON, handling manually')

        intent = {command: "none"}

    }

    console.log(intent)

    if(intent.command === 'create_wallet') {

        console.log('Inside create wallet block')

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

        res.sendStatus(200)

        return

    } else if(intent.command === 'transfer_sol') {

        console.log('Inside transfer SOL block')

        const { rows } = await pool.query('SELECT pubkey FROM users where telegram_user_id = $1;', [userId])

        let reply;

        if(rows.length === 0) {

            reply = 'You do not have a wallet. Please prompt to create a wallet'
        
        } else {

            if(intent.to === "" && intent.amount === "") {

                reply = 'Please specify the address to whom you want to transfer and please specify the amount too'
            
            } else if(intent.to === '') {

                reply = 'Please specify the address to whom you want to transfer'
            
            } else if(intent.amount === "") {

                reply = 'Please specify the amount too'

                await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, { chat_id: msg.chat.id, text: reply })

                res.sendStatus(200)

                return
            
            } else {


                const responses = await Promise.all([
                    
                    axios.post(process.env.SHAMERE1_GET_URL, { user_id: userId }),
                    
                    axios.post(process.env.SHAMERE2_GET_URL, { user_id: userId }),
                    
                    axios.post(process.env.SHAMERE3_GET_URL, { user_id: userId }),
                
                ])

                const shares = responses.map(resp => Buffer.from(resp.data.share, 'hex'))

                const secret = sss.combine(shares)

                const senderKeypair = Keypair.fromSecretKey(Uint8Array.from(secret))

                const connection = new Connection("https://api.devnet.solana.com")


                const recipient = new PublicKey(intent.to)

                const valid = validSolanaAddress(recipient)

                if(!valid) {

                    reply = 'Please enter a valid solana address'

                    await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, { chat_id: msg.chat.id, text: reply })

                    res.sendStatus(200)

                    return
                
                }
                
                
                const lamports = Math.floor(Number(intent.amount) * LAMPORTS_PER_SOL)

                const transaction = new Transaction().add(SystemProgram.transfer({

                    fromPubkey: senderKeypair.publicKey,
                    toPubkey: recipient,
                    lamports,
                
                }))


                let signature

                try {
                    
                    signature = await sendAndConfirmTransaction(connection, transaction, [senderKeypair])

                } catch(e) {

                    console.error('Transaction failed: ', e)

                    reply = `Transaction failed: ${e.message || e}`


                    await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
                        
                        chat_id: msg.chat.id,
                        
                        text: reply
                    })

                    res.sendStatus(200)

                    return

                }


                reply = `Transfer of ${intent.amount} SOL to ${intent.to} complete!\nSignature: ${signature}`

                
            }

        }

        await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, { chat_id: msg.chat.id, text: reply })

        res.sendStatus(200)

        return

    } else if(intent.command === 'eject') {

        console.log('Inside eject block')

        let reply;

        const { rows } = await pool.query('SELECT pubkey from users where telegram_user_id = $1', [userId])

        if(rows.length === 0) {

            reply = 'You do not have a wallet registered with us'

            await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, { chat_id: msg.chat.id, text: reply })

            res.sendStatus(200)

            return

        }

        let responses

        try {

            responses = await Promise.all([

                axios.post(process.env.SHAMERE1_GET_URL, { user_id: userId }),

                axios.post(process.env.SHAMERE2_GET_URL, { user_id: userId }),

                axios.post(process.env.SHAMERE3_GET_URL, { user_id: userId })
            ])
        
        } catch(e) {

            reply = 'Error in retrieving your private key. Please try again later.'

            await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, { chat_id: msg.chat.id, text: reply });
            
            res.sendStatus(200);
            
            return

        }

        const shares = responses.map(resp => Buffer.from(resp.data.share, 'hex'))

        const secret = sss.combine(shares)

        const secretHex = secret.toString('hex')


        reply = `Here is your private key (please save it securely): \n${secretHex}`


        await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
            
            chat_id: msg.chat.id,
            
            text: reply,
        })

        res.sendStatus(200);
    
        return


    } else {

        console.log('Inside tell me what to do block')

        let reply = 'Please tell me what to do'

        await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, { chat_id: msg.chat.id, text: reply })

        res.sendStatus(200)

    }

})


app.listen(PORT, () => {

    console.log(`Main server running on PORT: ${PORT}`)
})