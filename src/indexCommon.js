const { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription } = require("node-datachannel/polyfill"); // require("@koush/wrtc"); 
const { Crypto } = require("@peculiar/webcrypto");
const WebSocket = require("ws");
const fetch = require("node-fetch");
//const XMLHttpRequest = require("xhr2");
const perfHooks = require("perf_hooks");
const JSON5 = require("json5");
const pako = require("pako");

module.exports = function(initAPI, window, config){
  return initAPI(
    {
      setTimeout: window?.setTimeout || setTimeout,
      clearTimeout: window?.clearTimeout || clearTimeout,
      setInterval: window?.setInterval || setInterval,
      clearInterval: window?.clearInterval || clearInterval,
      console: window?.console || console,
      requestAnimationFrame: window?.requestAnimationFrame || ((callback) => setTimeout(callback, 16.666666666666667)),
      cancelAnimationFrame: window?.cancelAnimationFrame || clearTimeout,
      RTCPeerConnection: window?.RTCPeerConnection || RTCPeerConnection, 
      RTCIceCandidate: window?.RTCIceCandidate || RTCIceCandidate, 
      RTCSessionDescription: window?.RTCSessionDescription || RTCSessionDescription, 
      crypto: window?.crypto || new Crypto(),
      WebSocket: window?.WebSocket || WebSocket,
      //XMLHttpRequest: window?.XMLHttpRequest || XMLHttpRequest,
      fetch: window?.fetch || fetch,
      performance: window?.performance || perfHooks.performance,
      JSON5: window?.JSON5 || JSON5,
      pako: window?.pako || pako
    }, 
    {
      proxy: {
        WebSocketChangeOriginAllowed: (config?.proxy?.WebSocketChangeOriginAllowed!=null) ? config.proxy.WebSocketChangeOriginAllowed : true,
        WebSocketUrl: config?.proxy?.WebSocketUrl,
        HttpUrl: config?.proxy?.HttpUrl,
      },
      backend: config?.backend,
      proxyAgent: config?.proxyAgent,
      stunServer: config?.stunServer,
      version: config?.version,
      noVariableValueChangeEvent: config?.noVariableValueChangeEvent,
      identityToken: config?.identityToken
    }
  );
};