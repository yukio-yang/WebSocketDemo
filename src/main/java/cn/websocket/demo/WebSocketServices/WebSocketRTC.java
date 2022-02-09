package cn.websocket.demo.WebSocketServices;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.alibaba.fastjson.JSONValidator;
import org.springframework.stereotype.Service;

import javax.websocket.OnClose;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.util.Date;
import java.util.TreeMap;
import java.util.Vector;

/**
 * WebSocket业务类
 * 此类用来作为RTC的信令服务器
 */
@Service
@ServerEndpoint("/websocketRTC")
public class WebSocketRTC {
    private static Vector<Session> sessions = new Vector<>();
    private static Vector<JSONObject> sessionProduce = new Vector<>();
    private static Vector<JSONObject> sessionProduceFs = new Vector<>();
    private static TreeMap<String,Session> sessionTreeMap = new TreeMap<>();
    private static TreeMap<String,Session> sessionTreeMapFs = new TreeMap<>();
    private static int loginNumber = 0;
    private Session session ;

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(WebSocketRTC.class);

    /**
     * 响应一个客户端WebSocket连接
     * @param session
     * @throws IOException
     */
    @OnOpen
    public void onopenproc(Session session) throws IOException {
        System.out.println("hava a client connected");
        this.session = session;

        JSONObject open = new JSONObject();

        open.put("status", "success");
        sendMessageToClient(open.toJSONString(), session);
    }

    /**
     * 响应一个客户端的连接关闭
     * @param session
     */
    @OnClose
    public void oncloseproc(Session session){
        System.out.println("had a client is disconneted");
//        sessionTreeMap.remove(data);

    }

    /**
     * 对于客户端消息的处理和响应
     * @param message 客户端发送的消息
     * @param session 客户端的WebSocket会话对象
     * @throws IOException
     */
    @OnMessage
    public void onmessageproc(String message , Session session) throws IOException {
        /**
         * 信令服务器与客户端之间的消息传递采用JSON
         */
        if(message!=null && JSONValidator.fromUtf8(message.getBytes("utf8")).validate()) {
            JSONObject msgJSON = JSON.parseObject(message);
/**
 * 消息中的type字段表示此次消息的类型
 * 服务器根据消息的type针对性的处理
 */
            switch (msgJSON.getString("type")) {
                case "login" :{
                    /**
                     * 处理客户端登录
                     */
                    log.info("session : "+session + "is login .. "+new Date());
                    log.info("user login in as "+msgJSON.getString("name"));
                    if (sessionTreeMap.containsKey(msgJSON.getString("name"))) {
                        JSONObject login = new JSONObject();
                        login.put("type", "login");
                        login.put("success", false);
                        sendMessageToClient(login.toJSONString() , session);

                    }else {
                        sessionTreeMap.put(msgJSON.getString("name"), session);
                        JSONObject login = new JSONObject();
                        login.put("type", "login");
                        login.put("success", true);
                        login.put("myName", msgJSON.getString("name"));
                        sendMessageToClient(login.toJSONString() , session);
                    }

                }break;
                case "offer": {
                    /**
                     * 处理offer消息
                     * offer是一个peer to peer 连接中的 第一步
                     * 这个是响应通话发起者的消息
                     * 这里主要是找到 通话发起者要通话的对方的会话
                     */
//                    onOffer(data.offer, data.name);\
                    log.info("Sending offer to " + msgJSON.getString("name")+" from "+msgJSON.getString("myName"));

                    Session conn = sessionTreeMap.get(msgJSON.getString("name"));

                    if (conn != null) {
                        JSONObject offer = new JSONObject();
                        offer.put("type", "offer");
                        offer.put("offer", msgJSON.getString("offer"));
                        offer.put("name", msgJSON.getString("name"));
                        sendMessageToClient(offer.toJSONString(), conn);

                        /**
                         * 保存会话状态
                         */
                        JSONObject offerAnswer = new JSONObject();
                        offerAnswer.put("offerName", msgJSON.getString("myName"));
                        offerAnswer.put("answerName", msgJSON.getString("name"));

                        JSONObject sessionTemp = new JSONObject();
                        sessionTemp.put("session", offerAnswer);
                        sessionTemp.put("type", "offer");

                        sessionProduce.add(sessionTemp);
                    }

                }
                    break;
                case "answer": {
/**
 * 响应answer消息
 * answer是 被通话客户端 对 发起通话者的回复
 */
                    log.info("answer ..." + sessionProduce.size());

                    for (int i = 0; i < sessionProduce.size(); i++) {
                        log.info(sessionProduce.get(i).toJSONString());
                    }

                    if (true) {
                        Session conn = null;
                        /**
                         * 保存会话状态
                         * 查询谁是应该接受Anser消息的人
                         */

                        for (int ii = 0; ii < sessionProduce.size(); ii++) {
                            JSONObject i = sessionProduce.get(ii);
                            JSONObject sessionJson = i.getJSONObject("session");
                            log.info(msgJSON.toJSONString());
                            log.info(sessionJson.toJSONString());

                            log.info("myName is " + msgJSON.getString("myName") + "   , answer to name " + sessionJson.getString("answerName"));
                            if (/*i.getString("offerName").equals(msgJSON.getString("name")) && */sessionJson.getString("answerName").equals(msgJSON.getString("myName"))) {
                                conn = sessionTreeMap.get(sessionJson.getString("offerName"));
                                log.info("Sending answer to " + sessionJson.getString("offerName") + " from " + msgJSON.getString("myName"));

                                sessionProduce.remove(ii);
                            }
                        }

                        JSONObject answer = new JSONObject();
                        answer.put("type", "answer");
                        answer.put("answer", msgJSON.getString("answer"));
                        sendMessageToClient(answer.toJSONString(),conn);



                    }
                }
                    break;
                case "candidate": {
                    /**
                     * 这个是对候选连接的处理
                     * 这个消息处理在一次通话中可能发生多次
                     */
                    log.info("Sending candidate to "+msgJSON.getString("name"));
                    Session conn = sessionTreeMap.get(msgJSON.getString("name"));
                    if (conn != null) {
                        JSONObject candidate = new JSONObject();
                        candidate.put("type", "candidate");
                        candidate.put("candidate", msgJSON.getString("candidate"));
                        sendMessageToClient(candidate.toJSONString(),conn );
                    }
                }
                    break;
                case "leave":{
                    /**
                     * 此消息是处理结束通话的事件
                     */
                    log.info("Disconnectiong user from " + msgJSON.getString(" name"));
                    Session conn = sessionTreeMap.get(msgJSON.getString("name"));

                    if (conn != null) {
                        JSONObject leave = new JSONObject();
                        leave.put("type", "leave");

                        sendMessageToClient(leave.toJSONString(),conn);
                    }
                }

                    break;
//                ############################################################
                case "connect" :{
                    /**
                     * 处理客户端登录
                     */
                    log.info("session : "+session + "is login .. "+new Date()+" event is connect");
                    log.info("user login in as "+msgJSON.getString("name"));
                    if (sessionTreeMapFs.containsKey(msgJSON.getString("name"))) {
                        JSONObject login = new JSONObject();
                        login.put("type", "connect");
                        login.put("success", false);
                        sendMessageToClient(login.toJSONString() , session);

                    }else {
                        sessionTreeMapFs.put(msgJSON.getString("name"), session);
                        JSONObject login = new JSONObject();
                        login.put("type", "connect");
                        login.put("success", true);
                        login.put("myName", msgJSON.getString("name"));
                        sendMessageToClient(login.toJSONString() , session);
                    }

                }break;
                case "offerfs": {
                    /**
                     * 处理offer消息
                     * offer是一个peer to peer 连接中的 第一步
                     * 这个是响应通话发起者的消息
                     * 这里主要是找到 通话发起者要通话的对方的会话
                     */
//                    onOffer(data.offer, data.name);\
                    log.info("Sending offer to " + msgJSON.getString("name")+" from "+msgJSON.getString("myName"));

                    Session conn = sessionTreeMapFs.get(msgJSON.getString("name"));

                    if (conn != null) {
                        JSONObject offer = new JSONObject();
                        offer.put("type", "offerfs");
                        offer.put("offer", msgJSON.getString("offer"));
                        offer.put("name", msgJSON.getString("name"));
                        sendMessageToClient(offer.toJSONString(), conn);

                        /**
                         * 保存会话状态
                         */
                        JSONObject offerAnswer = new JSONObject();
                        offerAnswer.put("offerName", msgJSON.getString("myName"));
                        offerAnswer.put("answerName", msgJSON.getString("name"));

                        JSONObject sessionTemp = new JSONObject();
                        sessionTemp.put("session", offerAnswer);
                        sessionTemp.put("type", "offer");

                        sessionProduceFs.add(sessionTemp);
                    }

                }
                break;
                case "answerfs": {
/**
 * 响应answer消息
 * answer是 被通话客户端 对 发起通话者的回复
 */
                    log.info("answer . fs .." + sessionProduceFs.size());

                    for (int i = 0; i < sessionProduceFs.size(); i++) {
                        log.info(sessionProduceFs.get(i).toJSONString());
                    }

                    if (true) {
                        Session conn = null;
                        /**
                         * 保存会话状态
                         * 查询谁是应该接受Anser消息的人
                         */

                        for (int ii = 0; ii < sessionProduceFs.size(); ii++) {
                            JSONObject i = sessionProduceFs.get(ii);
                            JSONObject sessionJson = i.getJSONObject("session");
                            log.info(msgJSON.toJSONString());
                            log.info(sessionJson.toJSONString());

                            log.info("myName is " + msgJSON.getString("myName") + "   , answer to name " + sessionJson.getString("answerName"));
                            if (/*i.getString("offerName").equals(msgJSON.getString("name")) && */sessionJson.getString("answerName").equals(msgJSON.getString("myName"))) {
                                conn = sessionTreeMapFs.get(sessionJson.getString("offerName"));
                                log.info("Sending answer to " + sessionJson.getString("offerName") + " from " + msgJSON.getString("myName"));

                                sessionProduceFs.remove(ii);
                            }
                        }

                        JSONObject answer = new JSONObject();
                        answer.put("type", "answerfs");
                        answer.put("answer", msgJSON.getString("answer"));
                        sendMessageToClient(answer.toJSONString(),conn);



                    }
                }
                break;
                case "candidatefs": {
                    /**
                     * 这个是对候选连接的处理
                     * 这个消息处理在一次通话中可能发生多次
                     */
                    log.info("Sending candidate to "+msgJSON.getString("name"));
                    Session conn = sessionTreeMapFs.get(msgJSON.getString("name"));
                    if (conn != null) {
                        JSONObject candidate = new JSONObject();
                        candidate.put("type", "candidatefs");
                        candidate.put("candidate", msgJSON.getString("candidate"));
                        sendMessageToClient(candidate.toJSONString(),conn );
                    }
                }
                break;
                case "leavefs":{
                    /**
                     * 此消息是处理结束通话的事件
                     */
                    log.info("Disconnectiong user from " + msgJSON.getString(" name"));
                    Session conn = sessionTreeMapFs.get(msgJSON.getString("name"));

                    if (conn != null) {
                        JSONObject leave = new JSONObject();
                        leave.put("type", "leavefs");

                        sendMessageToClient(leave.toJSONString(),conn);
                    }
                }

                break;
//                ############################################################
                default:
                    JSONObject defaultMsg = new JSONObject();
                    defaultMsg.put("type", "error");
                    defaultMsg.put("message", "Unreconfized command : "+ msgJSON.getString("type") );
                    sendMessageToClient(defaultMsg.toJSONString(),session);
                    break;
            }
            System.out.println(message);
        }
    }

    /**
     * 发送消息
     * @param msg
     * @throws IOException
     */
    public void sendMessage(String msg) throws IOException {
        if(this.session!=null)
        this.session.getBasicRemote().sendText("hello everyone!");
        this.session.getBasicRemote().sendText(msg);
    }

    public void sendMessageForAllClient(String msg){
        if(!sessions.isEmpty()){
            sessions.forEach(i->{
                try {
                    if(i.isOpen()) {
                        i.getBasicRemote().sendText(msg+" : "+new Date().toString());
                    }
                } catch (IOException e) {
                    e.printStackTrace();
                }
            });
        }
    }

    /**
     * 向指定客户端发送消息
     * @param msg
     * @param session
     * @throws IOException
     */
    public void sendMessageToClient(String msg , Session session) throws IOException {
        if(session.isOpen())
        session.getBasicRemote().sendText(msg);
    }
}
