# webrtc-fullmesh-signaling-server
A signaling server for a full-mesh WebRTC network - runs in Node.js

## Install
`npm i -S webrtc-fullmesh-signaling-server`

## Usage
Just require it in your node server entry file (the default port is 2013):
`require( 'webrtc-fullmesh-signaling-server' )`

## Client Code
The following is an example using the npm package simple-peer:
`
import SimplePeer from 'simple-peer';

const uuid = /*myCoolUUIDGeneratorFunction()*/

function startup() {
    socket = io.connect( /*SIGNALING_SERVER_ADDRESS*/, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax : 5000,
        reconnectionAttempts: 99999
    });        


    socket.on( 'connected', (data)=>{
        console.log( 'got "connected" message from signaling server - data:' );
        console.log( data ); // should contain all the uuid's of extant clients

        for( var i = 0; i < data.allClientIds.length; ++i ) {
            var clientId = data.allClientIds[ i ];
            if( clientId===uuid ) {
            	// don't store my own uuid as a peer
                continue;
            }

            var p = peers[clientId] = new SimplePeer({
                initiator: true,
                channelName: 'my_cool_channel_name'
            });

            addPeerListeners( p, clientId );
        }
        
        // send my uuid to the signaling server
        socket.emit( 'uuid', {uuid} );
    });

    socket.on( 'new_peer', (data)=>{
        if( data.newPeerId === uuid ) {
        	// don't do anything if i got my own uuid
            return;
        }

        var p = peers[data.newPeerId] = new SimplePeer({
            initiator: false,
            channelName: 'the_esl_chain'
        });

        addPeerListeners( p, data.newPeerId );
    });

    socket.on( 'signal', (data)=>{
        console.log( 'got signal from signaling server:' );
        console.log( data );

        if( peers[data.senderId] ) {
            peers[data.senderId].signal( JSON.stringify(data) );
        }
    });
}

function addPeerListeners( p, peerId ) {
    p.on('error', function (err) { console.error(err); });

    p.on('signal', function (data) {
      data.senderId = uuid;
      data.receiverId = peerId;
      console.log('SIGNAL', JSON.stringify(data));
      socket.emit( 'signal', data );
    });

    p.on('connect', function () {
      console.log('WebRTC connection!');
    });

    p.on('data', function (data) {
      data = JSON.parse( data );
      console.log( 'data: ' );
      console.log( data );
      // do whatever you want with the data now
    });

    p.on( 'close', ()=>{
        delete peers[ peerId ];
    });
}

function sendDataToPeers( data ) {
	// will send the data to every single peer in the network

    for( var peerId in peers ) {
        try {
            peers[peerId].send( JSON.stringify(data) );
        } catch( error ) {
            console.warn( error );
        }
    }
}
`