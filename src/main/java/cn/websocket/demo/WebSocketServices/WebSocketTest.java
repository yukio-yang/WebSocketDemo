package cn.websocket.demo.WebSocketServices;

import cn.websocket.demo.WebSocketConfig.WebSocketConfig;
import org.springframework.stereotype.Service;

import javax.websocket.OnClose;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.util.Collections;
import java.util.Date;
import java.util.TreeMap;
import java.util.Vector;
import java.util.concurrent.CopyOnWriteArraySet;

//@Service
//@ServerEndpoint("/websocket")
public class WebSocketTest {
    private static Vector<Session> sessions = new Vector<>();
    private static TreeMap<String,Session> sessionTreeMap = new TreeMap<>();
    private static int loginNumber = 0;
    private Session session ;
    @OnOpen
    public void onopenproc(Session session) throws IOException {
        System.out.println("hava a client connected");
        this.session = session;
        sessions.add(session);
        if(loginNumber == 0)
            loginNumber++;
        else if(loginNumber == 1) {
            sessionTreeMap.put("aa", session);
            loginNumber++;
            sendMessageToClient("我是用户 aa " , session);
        }
        else if(loginNumber == 2) {
            sessionTreeMap.put("bb", session);
            loginNumber++;
            sendMessageToClient("我是用户 bb " , session);
        }
           else if(loginNumber == 3) {
                sessionTreeMap.put("cc", session);
                loginNumber++;
            sendMessageToClient("我是用户 cc " , session);
        }
        else if(loginNumber == 4) {
            sessionTreeMap.put("dd", session);
            loginNumber++;
            sendMessageToClient("我是用户 dd " , session);
        }
    }
    @OnClose
    public void oncloseproc(){
        System.out.println("had a client is disconneted");
    }
    @OnMessage
    public void onmessageproc(String message , Session session) throws IOException {
        if(message!=null) {
            StringBuffer stringBuffer = new StringBuffer();
            sessionTreeMap.forEach((k,v)->{
                if(v.equals(session)){
                    stringBuffer.append(k);
                }
            });

            switch (message.substring(0,2)){
                case "aa" :{
                    sendMessageToClient("From : "+stringBuffer.toString() + " : " + message , sessionTreeMap.get("aa"));
                }break;
                case "bb":{
                    sendMessageToClient("From : "+stringBuffer.toString() + " : " + message , sessionTreeMap.get("bb"));
                }break;
                case "cc":{
                    sendMessageToClient("From : "+stringBuffer.toString() + " : " + message , sessionTreeMap.get("cc"));
                }break;
                case "dd":{
                    sendMessageToClient("From : "+stringBuffer.toString() + " : " + message , sessionTreeMap.get("dd"));
                }break;
            }
            System.out.println(message);
        }
    }

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

    public void sendMessageToClient(String msg , Session session) throws IOException {
        if(session.isOpen())
        session.getBasicRemote().sendText(msg);
    }
}
