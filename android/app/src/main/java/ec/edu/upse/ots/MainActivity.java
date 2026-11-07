package ec.edu.upse.ots;

import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onStart() {
        super.onStart();
        // Evita que el tamaño de fuente / "tamaño de pantalla" del sistema Android agrande toda
        // la app: el WebView se fija al 100% y así la interfaz se ve igual en todos los teléfonos,
        // sin importar la configuración de accesibilidad del dispositivo.
        if (this.bridge != null) {
            WebView webView = this.bridge.getWebView();
            if (webView != null) {
                webView.getSettings().setTextZoom(100);
            }
        }
    }
}
