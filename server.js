/*----------------------------------------------- #||--wss--|| */


// #\-IMPORTS-\

    // --WS
    import express             from 'express'
    import { WebSocketServer } from 'ws'

    // --LIB

    // --CONTEXTS

    // --JS

//=======@COMPONENTS|

    // --*


// #\-EXPORTS-\

    // --THIS


// #\-CONSTANTES-\

    // --THIS
    const
    SERVER_PORT = process.env.PORT || 8080,
    SERVER_APP  = express()

    const
    WSS_LOGIN = new WebSocketServer({ noServer: true }),
    WSS_GAME  = new WebSocketServer({ noServer: true })
    ,
    WSS_STR       = 'abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
    WSS_ID_LENGTH = 8
    ,
    WSS_CLIENTS = {}
    


// #\-VARIABLES-\

    // --THIS
    let server_SERVER


// #\-FUNCTIONS-\

    // --SET
    ;(function server_set()
    {
        server_setVars()
        server_setEvents()
    })()

    function server_setVars() { server_SERVER = SERVER_APP.listen(SERVER_PORT, () => console.log('listening on port: ' + SERVER_PORT)) }

    function server_setEvents()
    {
        server_SERVER.on('upgrade', server_eUpgrade)
    }

    function wss_setNewClient(data)
    {
        const
        ID     = wss_getRandomId(),
        PSEUDO = data.pseudo
    
        try
        {
            if (wss_testPseudo(PSEUDO)) WSS_CLIENTS[ID] = { online: false, ...data }
            else                        throw new Error(`Pseudo '${PSEUDO}' already exist.`)

            wss_send(this, 'connection', { id: ID })
        }
        catch ({message}) { wss_send(this, 'connectionError', { error: message }) }
    }

    function wss_setClientConnection({id})
    {
        try
        {
            wss_updateClientState(id, true)
            wss_setClientEvents.call(this, id)

            wss_send(this, 'connection', { success: true })
        }
        catch ({message}) { wss_send(this, 'connectionError', { error: message }) }
    }

    function wss_setClientEvents(id)
    {
        this.on('close', wss_eClientClose.bind(this, id))
    }

    function wss_setClientMessage({id, message})
    {
        try
        {
            wss_testClientId(id)
            wss_testClientMessage(message)

            const PSEUDO = WSS_CLIENTS[id]?.pseudo
        
            wss_sendAll(WSS_GAME, 'message', { id, pseudo: PSEUDO, message })
        }
        catch ({message}) { wss_send(this, 'messageError', { error: message })}
    }

    // --GET
    function wss_getRandomId()
	{
		const LENGTH = WSS_STR.length - 1

        let id = ''
    
        for (let i = 0; i < WSS_ID_LENGTH; i++) id += WSS_STR[Math.round(Math.random() * LENGTH)]

        return id in WSS_CLIENTS ? wss_getRandomId() : id
    }

    // --UPDATES
    function wss_updateLogin(r, s, h)
    {
        WSS_LOGIN.handleUpgrade(r, s, h, ws =>
        {
            ws.on('message', wss_eLoginMessage.bind(ws))
        })
    }

    function wss_updateGame(r, s, h)
    {
        WSS_GAME.handleUpgrade(r, s, h, ws =>
        {
            ws.on('message', wss_eGameMessage.bind(ws))
        })
    }

    function wss_updateClientState(id, state)
    {
        wss_testClientId(id)

        WSS_CLIENTS[id].online = state
    }


//=======@EVENTS|

    // --*
    function server_eUpgrade(r, s, h)
    {
        switch (r.url)
        {
            case '/login': wss_updateLogin(r, s, h) ;break
            case '/game' : wss_updateGame (r, s, h) ;break
            default      : s.destroy()              ;break
        }
    }

    function wss_eLoginMessage(data)
    {
        const DATA = JSON.parse(data)

        if (DATA.event === 'connection')
        {
            delete DATA.event

            wss_setNewClient.call(this, DATA)
        }
    }

    function wss_eGameMessage(data)
    {
        const DATA = JSON.parse(data)

        if (DATA.event === 'connection')
        {
            delete DATA.event

            wss_setClientConnection.call(this, DATA)
        }
        else if (DATA.event === 'message')
        {
            wss_setClientMessage.call(this, DATA)
        }
    }

    function wss_eClientClose(id)
    {
        wss_updateClientState(id, false)
    }

//=======@UTILS|

    // --*
    function wss_send(socket = {}, event = '', data = {}) { if (socket?.send instanceof Function) socket.send(JSON.stringify({ event, ...data })) }

    function wss_sendAll({clients}, event = '', data = {})
    {
        if (clients instanceof Set)
        {
            for (const CLIENT of clients) wss_send(CLIENT, event, data)
        }
    }

    function wss_testPseudo(pseudo)
    {
        for (const ID in WSS_CLIENTS) if (WSS_CLIENTS[ID].pseudo === pseudo) return false

        return true
    }

    function wss_testClientId(id)
    {
        if (id == null)                  throw new Error('Identifier null.')
        if (id.length !== WSS_ID_LENGTH) throw new Error('Incorrect identifier size.')
        if (!(id in WSS_CLIENTS))        throw new Error('Identifier unknown.')
    }

    function wss_testClientMessage(message)
    {
        if (message == null || message === '') throw new Error('Message null.')
    }