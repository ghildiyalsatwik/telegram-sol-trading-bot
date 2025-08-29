import 'dotenv/config'  
    
    // const userMessage = 'I want to transfer SOL'

    // const userMessage = 'I want to transfer to 6YuRPBWr7bCsuqqpfyVRWMb4Gi6J6T5YNzgk2tV6Kf38'

    // const userMessage = 'I want to transfer Solana to: 5XhKfpXHWpp6sPmt1LFXG4wgovncwmbqYiCnhcARuBKm. 22 solana'

    // const userMessage = 'I want to transfer Solana to: 5XhKfpXHWpp6sPmt1LFXG4wgovncwmbqYiCnhcARuBKm.'

    // const userMessage = 'I want to transfer 25 Solana.'

    // const userMessage = 'I want to eject out of here.'

    // const userMessage = 'I want to send SOL'

    //const userMessage = 'I want to transfer SOL to this address: 6YuRPBWr7bCsuqqpfyVRWMb4Gi6J6T5YNzgk2tV6Kf38'

    // const userMessage = 'I want to transfer SOL to: 6YuRPBWr7bCsuqqpfyVRWMb4Gi6J6T5YNzgk2tV6Kf38'

    // const userMessage = 'I want to swap .5 SOL for USDC';

    // const userMessage = 'I want to swap SOL with USDT';

    // const userMessage = 'Create a wallet for me'

    // const userMessage = 'I want to swap 2 SOL.'

    // const userMessage = 'I want to buy PONKE with 2 SOL'

    const userMessage = 'What is my balance?'

    const systemPrompt = process.env.systemPrompt.replace(/\\n/g, "\n")

    const finalPrompt = `###System: ${systemPrompt}
    
    ###User : ${userMessage}`

    const llmResp = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          prompt: finalPrompt,
          stream: false
        
        })
    })

    const data = await llmResp.json()

    const llmOutput = data.response.trim()

    console.log(llmOutput)

    const intent = JSON.parse(llmOutput)

    console.log(intent)