package cn.websocket.demo.config;

import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * @author yukio
 * @create 2021-01-04 11:21
 */
//@Configuration
public class MyMvcConfig implements WebMvcConfigurer {
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
//        registry.addViewController("/").setViewName("login");
        //它会找templates文件夹下的文件是因为模版映射的关系,templates为Spring Boot默认jar包使用嵌入式的Tomcat
        registry.addViewController("/Index.html").setViewName("/templates/Index");
//        registry.addViewController("/main.html").setViewName("dashboard");
    }
    //注册拦截器
    @Override
//    public void addInterceptors(InterceptorRegistry registry) {
//        //静态资源在springboot2.0以前已经做好映射，不用管                      /**指任意范围都通过拦截
//        registry.addInterceptor(new LoginHandlerInterceptor()).addPathPatterns("/**")
//                .excludePathPatterns("/index.html","/","/user/login","/asserts/**","/webjars/**");
//    }

    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**").allowedOrigins(new String[]{"*"}).allowCredentials(true).allowedMethods(new String[]{"OPTIONS", "GET", "POST", "PUT", "DELETE", "HEAD", "PATCH", "TRACE"}).maxAge(3600L);
    }
}
