  // 核心的javascript

  // 声明 变量 ： 记录自己的登录名 ， 对方的登录名
  var name,
      connectedUser;
  var myName;

  // 建立WebSocket连接 信令服务器
  var connection = new WebSocket("wss://119.3.239.168:9443/websocketRTC");
// var connection = new WebSocket("wss://localhost:9443/websocketRTC");

  // 自己的RTCPeerConnection
  // RTC 最重要的对象
  var yourConnection;
  var yourConnectionForFileShare;

  // 用于文件共享的变量
  var currentFile, currentFileSize, currentFileMeta;

  // 打开连接事件响应
  connection.onopen = function () {
    console.log("Connected");
  };

// Handle all messages through this callback
  connection.onmessage = function (message) {
    console.log("Got message", message.data);

    var data = JSON.parse(message.data);

    switch (data.type) {
      case "login":
        onLogin(data.success);
        break;
      case "offer":
        onOffer(data.offer, data.name);
        break;
      case "answer":
        onAnswer(data.answer);
        break;
      case "candidate":
        onCandidate(data.candidate);
        break;
      case "leave":
        onLeave();
        break;
      case "connect":
        onConnect(data.success);
        break;
      case "offerfs":
        onOfferFs(data.offer, data.name);
        break;
      case "answerfs":
        onAnswerFs(data.answer);
        break;
      case "candidatefs":
        onCandidateFs(data.candidate);
        break;
      case "leavefs":
        onLeaveFs();
        break;
      default:
        console.log("default message");
        console.log(data);
        break;
    }
  };

  connection.onerror = function (err) {
    console.log("Got error", err);
  };

  connection.onclose = function () {
    console.log("Got close");
  }

//  发送消息的方法 向信令服务器
// Alias for sending messages in JSON format
  function send(message) {
    if (connectedUser) {
      message.name = connectedUser;
      message.myName = name;
    }

    connection.send(JSON.stringify(message));
  };

  // 绑定HTML上的一些标签
  var loginPage = document.querySelector('#login-page'),
      usernameInput = document.querySelector('#username'),
      loginButton = document.querySelector('#login'),
      callPage = document.querySelector('#call-page'),
      theirUsernameInput = document.querySelector('#their-username'),
      callButton = document.querySelector('#call'),
      hangUpButton = document.querySelector('#hang-up'),
      messageInput = document.querySelector('#message'),
      sendButton = document.querySelector('#send'),
      received = document.querySelector('#received'),
      connectButton = document.querySelector('#connect'),
      readySendButton = document.querySelector('#readySend'),
      sendFileButton = document.querySelector('#sendFile'),
      statusText = document.querySelector('#status'),
      readyText = document.querySelector('#ready');

  callPage.style.display = "none";
  readyText.style.display = "none";
//  登录按钮click事件响应
// Login when the user clicks the button
//  记录登录名，向信令服务器发送登录信息
  loginButton.addEventListener("click", function (event) {
    name = usernameInput.value;

    myName = usernameInput.value;

    if (name.length > 0) {
      send({
        type: "login",
        name: name
      });
    }
  });

  // 响应信令服务器反馈的登录信息
  function onLogin(success) {
    if (success === false) {
      alert("Login unsuccessful, please try a different name.");
    } else {
      loginPage.style.display = "none";
      callPage.style.display = "block";

      // Get the plumbing ready for a call
      //  准备开始一个连接
      startConnection();
    }
  };


  var yourVideo = document.querySelector('#yours'),
      theirVideo = document.querySelector('#theirs'),
      // yourConnection, connectedUser, stream, dataChannel;
      connectedUser, stream, dataChannel,fileDataChannel;

  // 打开自己的摄像头
  // 准备开始一次peer to peer 连接
  function startConnection() {

    // 想要获取一个最接近 1280x720 的相机分辨率
    var constraints = {audio: true, video: {width: 320, height: 480}};
    navigator.mediaDevices.getUserMedia(constraints)
        .then(function (mediaStream) {
          // var video = document.querySelector('video');

          yourVideo.srcObject = mediaStream;

          if (hasRTCPeerConnection()) {
            console.log("setupPeerConnection .. ")
            setupPeerConnection(mediaStream);
          } else {
            alert("Sorry, your browser does not support WebRTC.");
          }

          yourVideo.onloadedmetadata = function (e) {
            yourVideo.play();
          };


        })
        .catch(function (err) {
          console.log(err.name + " -- : " + err.message);
        });

  }

  // 创建RTCPeerConnection对象 ，绑定ICE服务器，绑定多媒体数据流
  function setupPeerConnection(stream) {
    if (yourConnection == null) {
      var configuration = {
        // "iceServers": [{ "url": "stun:127.0.0.1:9876" }]
        "iceServers": [{"url": "stun:119.3.239.168:3478"}, {
          "url": "turn:119.3.239.168:3478",
          "username": "codeboy",
          "credential": "helloworld"
        }]
      };
      yourConnection = new RTCPeerConnection(configuration, {optional: [{RtpDataChannels: true}]});
    }


    if (yourConnection == null) {
      console.log("yourConneion is null");
    } else {
      console.log("yourConnection is a object")
    }

    console.log("========================= setupPeerConnection stream ====================================")
    // console.log(stream);

    // Setup stream listening
    yourConnection.addStream(stream);
    yourConnection.onaddstream = function (e) {

      console.log(e);
      // theirVideo.src = window.URL.createObjectURL(e.stream);
      theirVideo.srcObject = e.stream;
      theirVideo.play();
    };

    // Setup ice handling
    yourConnection.onicecandidate = function (event) {
      if (event.candidate) {
        send({
          type: "candidate",
          candidate: event.candidate
        });
      }
    };

    // 打开数据通道 （这个是用于 文字交流用）
    openDataChannel();
  //  打开数据通道（这个是用于 文件共享用）
  //  TODO
  //   openFileDataChannel();
  }

  function openDataChannel() {
    var dataChannelOptions = {
      reliable: true
    };
    dataChannel = yourConnection.createDataChannel("myLabel", dataChannelOptions);

    dataChannel.onerror = function (error) {
      console.log("Data Channel Error:", error);
    };

    dataChannel.onmessage = function (event) {
      console.log("Got Data Channel Message:", event.data);

      received.innerHTML += event.data + "<br />";
      received.scrollTop = received.scrollHeight;
    };

    dataChannel.onopen = function () {
      dataChannel.send(name + " has connected.");
    };

    dataChannel.onclose = function () {
      console.log("The Data Channel is Closed");
    };
  }


// Bind our text input and received area
  sendButton.addEventListener("click", function (event) {
    var val = messageInput.value;
    received.innerHTML += val + "<br />";
    received.scrollTop = received.scrollHeight;
    dataChannel.send(val);
  });

/*  function hasUserMedia() {
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    return !!navigator.getUserMedia;
  }*/

  function hasRTCPeerConnection() {
    window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    window.RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription;
    window.RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate || window.mozRTCIceCandidate;
    return !!window.RTCPeerConnection;
  }

  callButton.addEventListener("click", function () {
    var theirUsername = theirUsernameInput.value;
    console.log("call " + theirUsername)
    if (theirUsername.length > 0) {
      startPeerConnection(theirUsername);
    }
  });

  // 开始peer to peer 连接
  function startPeerConnection(user) {
    connectedUser = user;

    // yourConnection
    // Begin the offer

    // 发送通话请求 1
    yourConnection.createOffer(function (offer) {
      console.log("    yourConnection.createOffer");
      send({
        type: "offer",
        offer: offer
      });

      console.log("     yourConnection.setLocalDescription(offer);");
      yourConnection.setLocalDescription(offer);
    }, function (error) {
      alert("An error has occurred.");
    });
  };

  // 接受通话者 响应 通话请求 2
  function onOffer(offer, name) {
    connectedUser = name;

    console.log("============================================================");
    console.log("===============    onOffer       (===================");
    console.log("connector user name is "+connectedUser);
    console.log("============================================================");


    var offerJson = JSON.parse(offer);
    var sdp = offerJson.sdp;

    //   设置对方的会话描述
    try {
      console.log("                   yourConnection.setRemoteDescription                   ");
      yourConnection.setRemoteDescription(new window.RTCSessionDescription(offerJson), function () {
            console.log("success");
          }
          ,
          function () {
            console.log("fail")
          });

    } catch (e) {
      alert(e)
    }

    // 向通话请求者 发送回复消息 3
    yourConnection.createAnswer(function (answer) {
      yourConnection.setLocalDescription(answer);
      console.log("               yourConnection.createAnswer                  ");
      send({
        type: "answer",
        answer: answer
      });
    }, function (error) {
      alert("An error has occurred");
    });

    console.log("onOffer is success");

  };

  // 通话请求者 处理 回复 4
  function onAnswer(answer) {
    if (yourConnection == null) {
      alert("yourconnection is null in onAnswer");
    }

    console.log("============================================================");
    console.log("================ OnAnswer ============================");
    console.log("============================================================");
    console.log(answer);
    if (answer != null) {
      console.log(typeof answer);
    }

    var answerJson = JSON.parse(answer);
    console.log(answerJson);

    try {

      //  设置本次会话的描述
      yourConnection.setRemoteDescription(new RTCSessionDescription(answerJson));
    } catch (e) {
      alert(e);
    }

    console.log("onAnswer is success");

  };

  // 对ICE候选连接的事情响应
  function onCandidate(candidate) {
    console.log("============================================================");
    console.log("================ OnCandidate ============================");
    console.log("============================================================");
    console.log(candidate);
    if (candidate != null) {
      console.log(typeof candidate);
    }

    var iceCandidate;

    // try {

    var candidateJson = JSON.parse(candidate);
    console.log(candidateJson);

    iceCandidate = new RTCIceCandidate(candidateJson);
    // }catch(e){
    //   console.log("exception is ")
    //   console.log(e);
    // }

    if (yourConnection == null) {
      alert("yourconnection is null in onCandidate");
    }
    // yourConnection.addIceCandidate(new RTCIceCandidate(candidate));
    yourConnection.addIceCandidate(iceCandidate);
  };

  hangUpButton.addEventListener("click", function () {
    send({
      type: "leave"
    });

    onLeave();
  });

  function onLeave() {
    connectedUser = null;
    theirVideo.src = null;
    yourConnection.close();
    yourConnection.onicecandidate = null;
    yourConnection.onaddstream = null;
    setupPeerConnection(stream);
  };


  //======================================================================
  //====================File Share========================================

  //  登录按钮click事件响应
  // Login when the user clicks the button
  //  记录登录名，向信令服务器发送登录信息
  connectButton.addEventListener("click", function (event) {

    console.log("myname is " + name);

    if (name.length > 0) {
      send({
        type: "connect",
        name: name
      });
    }
  });

  // 响应信令服务器反馈的登录信息
  function onConnect(success) {
    if (success === false) {
      alert("Login unsuccessful, please try a different name.");
    } else {

      // Get the plumbing ready for a call
      //  准备开始一个连接 用于文件共享
      console.log(" 准备开始一个连接 用于文件共享 startFileShareConnection");
      startFileShareConnection();
    }
  };


  // 准备开始一次peer to peer 连接 用于文件共享
  function startFileShareConnection() {
    if (hasRTCPeerConnection()) {
      console.log("setupPeerConnection ..  setupFileSharePeerConnection")
      setupFileSharePeerConnection();
    } else {
      alert("Sorry, your browser does not support WebRTC.");
    }

  }

  // 创建RTCPeerConnection对象 ，绑定ICE服务器
  function setupFileSharePeerConnection() {
    if (yourConnectionForFileShare == null) {
      var configuration = {
        // "iceServers": [{ "url": "stun:127.0.0.1:9876" }]
        "iceServers": [{"url": "stun:119.3.239.168:3478"}, {
          "url": "turn:119.3.239.168:3478",
          "username": "codeboy",
          "credential": "helloworld"
        }]
      };
      yourConnectionForFileShare = new RTCPeerConnection(configuration, {optional: []});
    }


    if (yourConnectionForFileShare == null) {
      console.log("yourConnectionForFileShare is null");
    } else {
      console.log("yourConnectionForFileShare is a object")
    }

    console.log("========================= setupPeerConnection stream for file share====================================")

    // Setup ice handling
    yourConnectionForFileShare.onicecandidate = function (event) {
      if (event.candidate) {
        send({
          type: "candidatefs",
          candidate: event.candidate
        });
      }
    };

    //  打开数据通道（这个是用于 文件共享用）
    openFileDataChannel();
  }


  // 打开文件共享数据通道
  function openFileDataChannel() {

    let currentFileSizeP = 0;

    var dataChannelOptions = {
      ordered: true,
      reliable: true
      // ,
      // negotiated: true,
      // id: 0
    };
    fileDataChannel = yourConnectionForFileShare.createDataChannel("myFileChannel", dataChannelOptions);

    fileDataChannel.onerror = function (error) {
      console.log("Data Channel Error:", error);
    };

    yourConnectionForFileShare.ondatachannel=function(event){
    var receiveChannel = event.channel;
    receiveChannel.onmessage = function(event){
      console.log("Got Data Channel Message:", event.data);

      try {
        var message = JSON.parse(event.data);

        switch (message.type) {
          case "start":
            currentFile = [];
            currentFileSize = 0;
            currentFileMeta = message.data;
            console.log("Receiving file", currentFileMeta);
            break;
          case "end":
            console.log("file receive at end");
            saveFile(currentFileMeta, currentFile);
            break;
        }
      } catch (e) {
        // Assume this is file content
        console.log("正在接收文件 《《《《");
        currentFile.push(event.data);

        currentFileSizeP += currentFile[currentFile.length - 1].byteLength;

        var percentage = Math.floor((currentFileSizeP / currentFileMeta.size) * 100);
        statusText.innerHTML = "Receiving... " + percentage + "%";
      }

    };
  };

    fileDataChannel.onopen = function () {
      console.log("File DataChannel Open");
      // fileDataChannel.send(name + " has connected. for file share");
      readyText.style.display = "inline-block";
    };

    fileDataChannel.onclose = function () {
      readyText.style.display = "none";
    };
  }

  function saveFile(meta, data) {
    console.log("saveFile ....");
    var blob = new Blob(data);

    var link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = meta.name;
    link.click();
  }


  // 开始peer to peer 连接
  function startFileSharePeerConnection(user) {
    // Begin the offer

    connectedUser = user;
    name = usernameInput.value;

    console.log("myname is "+name +" , theirname is "+connectedUser)

    // 发送通话请求 1
    yourConnectionForFileShare.createOffer(function (offer) {
      console.log("    yourConnectionForFileShare.createOffer");
      send({
        type: "offerfs",
        offer: offer
      });

      console.log("     yourConnectionForFileShare.setLocalDescription(offer);");
      yourConnectionForFileShare.setLocalDescription(offer);
    }, function (error) {
      alert("An error has occurred.");
    });
  };




  readySendButton.addEventListener("click", function () {

    console.log("开始创建PeerToPeer连接")

    if (theirUsernameInput.value.length < 1) {
      alert("请先输入对方的账号");
      return;
    }

    var theirUsername = theirUsernameInput.value;
    console.log("call " + theirUsername)
    if (theirUsername.length > 0) {
      startFileSharePeerConnection(theirUsername);
    }
  });

  sendFileButton.addEventListener("click", function (event) {
    var files = document.querySelector('#files').files;

    if (files.length > 0) {
      // 获取文件元数据
      var filematett = {
        "name":  files[0].name,
        "type":  files[0].type,
        "size":  files[0].size,
        "lastModified": files[0].lastModified,
        "lastModifiedDate": files[0].lastModifiedDate,
        "webkitRelativePath": files[0].webkitRelativePath
    };

      dataChannelSend({
        type: "start",
        data: filematett
      });

      sendFile(files[0]);
    }
  });


  // 接受通话者 响应 通话请求 2
  function onOfferFs(offer, name) {
    connectedUser = name;

    console.log("============================================================");
    console.log("===============    onOffer       (===================");
    console.log("connector user name is "+connectedUser);
    console.log("============================================================");


    var offerJson = JSON.parse(offer);
    var sdp = offerJson.sdp;

    //   设置对方的会话描述
    try {
      console.log("                   yourConnection.setRemoteDescription                   ");
      yourConnectionForFileShare.setRemoteDescription(new window.RTCSessionDescription(offerJson), function () {
            console.log("success");
          }
          ,
          function () {
            console.log("fail")
          });

    } catch (e) {
      alert(e)
    }

    // 向通话请求者 发送回复消息 3
    yourConnectionForFileShare.createAnswer(function (answer) {
      yourConnectionForFileShare.setLocalDescription(answer);
      console.log("               yourConnectionForFileShare.createAnswer                  ");
      send({
        type: "answerfs",
        answer: answer
      });
    }, function (error) {
      alert("An error has occurred");
    });

    console.log("onOffer is success");

  };

  // 通话请求者 处理 回复 4
  function onAnswerFs(answer) {
    if (yourConnectionForFileShare == null) {
      alert("yourconnection is null in onAnswer");
    }

    console.log("============================================================");
    console.log("================ OnAnswer == for file share==========================");
    console.log("============================================================");
    console.log(answer);
    if (answer != null) {
      console.log(typeof answer);
    }

    var answerJson = JSON.parse(answer);
    console.log(answerJson);

    try {

      //  设置本次会话的描述
      yourConnectionForFileShare.setRemoteDescription(new RTCSessionDescription(answerJson));
    } catch (e) {
      alert(e);
    }

    console.log("onAnswer is success of file share");

  };

  // 对ICE候选连接的事情响应
  function onCandidateFs(candidate) {
    console.log("============================================================");
    console.log("================ OnCandidate ============================");
    console.log("============================================================");
    console.log(candidate);
    if (candidate != null) {
      console.log(typeof candidate);
    }

    var iceCandidate;

    var candidateJson = JSON.parse(candidate);
    console.log(candidateJson);

    iceCandidate = new RTCIceCandidate(candidateJson);

    if (yourConnectionForFileShare == null) {
      alert("yourconnection is null in onCandidate");
    }
    // yourConnectionForFileShare.addIceCandidate(new RTCIceCandidate(candidate));
    yourConnectionForFileShare.addIceCandidate(iceCandidate);
  };


  // Alias for sending messages in JSON format
  function dataChannelSend(message) {
    fileDataChannel.send(JSON.stringify(message));
  }


  function sendFile(file) {
    var intii = 0;
    var CHUNK_MAX = 163840;

    var reader = new FileReader();

    reader.onloadend =async function(evt) {

      console.log("FileReader 正在加载文件 。。。");

      if (evt.target.readyState == FileReader.DONE) {
        var buffer = reader.result,
            start = 0,
            end = 0,
            last = false;

        function sendChunk() {
          end = start + CHUNK_MAX;

          if (end > file.size) {
            end = file.size;
            last = true;
          }

          var percentage = Math.floor((end / file.size) * 100);
          statusText.innerHTML = "Sending... " + percentage + "%";

          console.log("++++++++++++++++++++++++++++ -- " + intii++);

          fileDataChannel.send(buffer.slice(start, end));

          // If this is the last chunk send our end message, otherwise keep sending
          if (last === true) {
            dataChannelSend({
              type: "end"
            });
          } else {
            start = end;
            // Throttle the sending to avoid flooding
            setTimeout(function () {
              sendChunk();
            }, 50);
          }
        }

        sendChunk();
      }
    };

    reader.readAsArrayBuffer(file);
  }
