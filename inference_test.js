import 'dotenv/config'  
    
    const userMessage = 'I want to transfer SOL'

    // const userMessage = 'I want to transfer Solana to: 5XhKfpXHWpp6sPmt1LFXG4wgovncwmbqYiCnhcARuBKm. 22 solana'

    // const userMessage = 'I want to transfer Solana to: 5XhKfpXHWpp6sPmt1LFXG4wgovncwmbqYiCnhcARuBKm.'

    // const userMessage = 'I want to transfer 25 Solana.'

    const systemPrompt = process.env.systemPrompt

    const finalPrompt = `###System: ${systemPrompt} 
    
    
    ###User : ${userMessage}`

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

    console.log(llmOutput)

    const intent = JSON.parse(llmOutput)

    console.log(intent)