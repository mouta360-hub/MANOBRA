package __PACKAGE__;

import android.view.WindowManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Mantém a tela do celular acesa enquanto o jogador está em partida/campeonato.
 * keepAwake({on:true}) liga; keepAwake({on:false}) devolve o comportamento normal do celular.
 */
@CapacitorPlugin(name = "ManobraScreen")
public class ManobraScreenPlugin extends Plugin {

    @PluginMethod
    public void keepAwake(final PluginCall call) {
        final boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (on) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                call.resolve();
            }
        });
    }
}
