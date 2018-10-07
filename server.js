var http=require('http');
var httpProxy = require('http-proxy');
const url = require('url')
var net=require('net');
var express=require('express');

var proxy = httpProxy.createProxyServer();
var app = express();
app.get('/',function(req,res){
    res.write("<h1>呵呵</h1>")
})
app.use(function(req,res){
	console.log(req.url);
	var option=url.parse(req.url);
	let host=option.protocol+`//`+option.host+ (option.port==null?"":":"+option.port);
    
    proxy.web(req, res, {
     target: host
		});
})


var server=http.createServer(app).listen(8088);



proxy.on('error',function(err){console.log('proxy error:',err)});

server.on('upgrade',function(req,res){
	console.log('upgrade');
});

server.on('connect',function(req, clientSocket, head){
    //if (!req.headers['proxy-authorization']) { // here you can add check for any username/password, I just check that this header must exist!
    //    clientSocket.write([
    //        'HTTP/1.1 407 Proxy Authentication Required',
    //        'Proxy-Authenticate: Basic realm="proxy"',
    //        'Proxy-Connection: close',
    //    ].join('\r\n'))
    //    clientSocket.end('\r\n\r\n')  // empty body
    //    return
    //}
    const { port, hostname } = url.parse(`//${req.url}`, false, true) // extract destination host and port from CONNECT request
	if (hostname && port) {
		//服务器出错处理
        const serverErrorHandler = (err) => {
            console.error("连接服务器错误:"+err.message)
            if (clientSocket) {
                clientSocket.end(`HTTP/1.1 500 ${err.message}\r\n`)
            }
        }
		//服务器终止处理
        const serverEndHandler = () => {
            if (clientSocket) {
                clientSocket.end(`HTTP/1.1 500 External Server End\r\n`)
            }
        }
        const serverSocket = net.connect(port, hostname) 
		serverSocket.setTimeout(15000);
		serverSocket.on('timeout', () => {
				console.log('socket timeout');
				serverSocket.end();
		});
		//客户端出错
        const clientErrorHandler = (err) => {
            console.error('客户端出错:'+err.message)
            if (serverSocket) {
                serverSocket.end()
            }
			clientSocket.end();
        }
		//客户端终止
        const clientEndHandler = () => {
            if (serverSocket) {
                serverSocket.end()
            }
			clientSocket.end();
        }
        clientSocket.on('error', clientErrorHandler)
        clientSocket.on('end', clientEndHandler)
        serverSocket.on('error', serverErrorHandler)
        serverSocket.on('end', serverEndHandler)
        serverSocket.on('connect', () => {
            clientSocket.write([
                'HTTP/1.1 200 Connection Established',
                'Proxy-agent: Node-VPN',
            ].join('\r\n'))
            clientSocket.write('\r\n\r\n') // empty body
            // "blindly" (for performance) pipe client socket and destination socket between each other
            serverSocket.pipe(clientSocket, { end: false })
            clientSocket.pipe(serverSocket, { end: false })
        })
    } else {
        clientSocket.end('HTTP/1.1 400 Bad Request\r\n')
        clientSocket.destroy()
    }

})
 













