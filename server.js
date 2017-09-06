const static = require('node-static');
const http = require('http');
const file = new(static.Server)();

const port = process.env.PORT || 2013;

const app = http.createServer( (req,res) => {
	file.serve( req, res );
}).listen( port, ()=>{
	console.log( 'Signaling server is listening on port '+port );
});

const p2pConnections = {};

const io = require('socket.io').listen( app );

io.sockets.on( 'connection', (socket)=>{

	console.log("Connection established!");

    socket.on( 'uuid', (data)=>{
        // the client should send its uuid as soon as a socket connection is established

        socket.clientId = data.uuid;
        p2pConnections[ data.uuid ] = {socket};
        console.log( 'num p2pConnections: '+Object.keys(p2pConnections).length );

        for( var clientId in p2pConnections ) {
            if( clientId === socket.clientId ) {
                // don't relay signals back to the originator
                continue;
            }

            p2pConnections[clientId].socket.emit( 'new_peer', {newPeerId:data.uuid} );
            // when the client receives this message, it should create a new peer object (such as with the simple-peer library on npm) and store it in a collection
        }
    });

    socket.on( 'signal', (data)=>{
        // a receiverId field must be attached to the signal data object (i.e. the uuid of the client the signal is intended for)
        console.log( 'got signal from clientId '+socket.clientId );
        console.log( '...the receiverId is '+data.receiverId );
        
        if( p2pConnections[data.receiverId] ) {
            p2pConnections[data.receiverId].socket.emit( 'signal', data );
        }
    });

    // when emitting the 'connected' message, we need to send an array of all the extant client uuids, so that the new client can offer a p2p connection to all of them
    var allClientIds = [];
    for( var clientId in p2pConnections ) {
        allClientIds.push( clientId );
    }
    socket.emit( 'connected', {allClientIds} );
});

// periodically iterate over the p2p connections list, and delete any that no longer have a connected socket
setInterval( ()=> {
    for( var clientId in p2pConnections ) {
        var stillConnected = false;
        for( var socketId in io.sockets.connected ) {
            if( socketId === p2pConnections[clientId].socket.id ) {
                stillConnected = true;
                break;
            }
        }

        if( !stillConnected ) {
            delete p2pConnections[ clientId ];
        }
    }

    console.log( 'num p2pConnections: '+Object.keys(p2pConnections).length );
}, 3000 );