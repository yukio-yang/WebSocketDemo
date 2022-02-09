package cn.websocket.demo.Controller;

import cn.websocket.demo.WebSocketServices.WebSocketTest;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class TestController {
    @RequestMapping("/")
    public String HomeIndexPage(){
        return "Index";
    }
    @RequestMapping("/firstPage")
    public String HomeIndexPage1(){
        return "First";
    }


    @RequestMapping("/publishanews")
    public String publishnewsproc(){
        WebSocketTest webSocketTest = new WebSocketTest();
        webSocketTest.sendMessageForAllClient("这是一条公告!");
        return "Index";
    }

    @GetMapping("/peerIndex")
    public String peerIndex() {
        return "lrindex";
    }

    /**
     * 登录及通话页面
     * @return
     */
    @RequestMapping("/index")
    public String index2Proc(){
        return "index2";
    }

    @GetMapping("/peer")
    public String peerProc(){
        return "peer";
    }

}
