package com.trackit.config;

import com.trackit.service.AttachmentService;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TomcatConfig {

    /**
     * Tomcat 10.1.42+ rejects multipart requests with more than 10 parts by default. An attachment upload sends
     * one part per file plus the folder paths, so allow the maximum file count with some headroom.
     */
    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> multipartPartLimit() {
        return factory -> factory.addConnectorCustomizers(
                connector -> connector.setMaxPartCount(AttachmentService.MAX_FILES + 5));
    }
}
