package __PACKAGE__;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothServerSocket;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Bluetooth clássico (RFCOMM) entre dois celulares já pareados.
 * Um celular chama listen() (anfitrião), o outro chama connect({address}).
 * As mensagens são linhas de texto (uma por linha, UTF-8).
 *
 * Eventos para o JavaScript: "connected" {name,address}, "message" {data}, "disconnected".
 */
@SuppressLint("MissingPermission")
@CapacitorPlugin(
    name = "ManobraBluetooth",
    permissions = {
        @Permission(alias = "bluetooth", strings = { Manifest.permission.BLUETOOTH_CONNECT })
    }
)
public class ManobraBluetoothPlugin extends Plugin {

    private static final UUID APP_UUID = UUID.fromString("7f4c3a10-6b1d-4d5e-9a6f-4d414e4f4252");

    private final Object lock = new Object();
    private final ExecutorService sender = Executors.newSingleThreadExecutor();
    private BluetoothServerSocket server;
    private BluetoothSocket socket;
    private OutputStream out;
    private volatile boolean closing = false;

    private BluetoothAdapter adapter() {
        BluetoothManager m = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        return m == null ? null : m.getAdapter();
    }

    // Antes do Android 12 a permissão é concedida na instalação; depois, precisa pedir em tempo de execução.
    private boolean hasPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        return getPermissionState("bluetooth") == PermissionState.GRANTED;
    }

    private String nameOf(BluetoothDevice d) {
        String n = null;
        try { n = d.getName(); } catch (SecurityException ignore) { }
        return n == null ? d.getAddress() : n;
    }

    @PluginMethod
    public void status(PluginCall call) {
        BluetoothAdapter a = adapter();
        JSObject r = new JSObject();
        r.put("available", a != null);
        r.put("enabled", a != null && a.isEnabled());
        r.put("permission", hasPermission());
        call.resolve(r);
    }

    @PluginMethod
    public void requestAccess(PluginCall call) {
        if (hasPermission()) {
            status(call);
            return;
        }
        requestPermissionForAlias("bluetooth", call, "accessCallback");
    }

    @PermissionCallback
    private void accessCallback(PluginCall call) {
        status(call);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Não foi possível abrir as configurações de Bluetooth.");
        }
    }

    @PluginMethod
    public void pairedDevices(PluginCall call) {
        BluetoothAdapter a = adapter();
        if (a == null) {
            call.reject("Este aparelho não tem Bluetooth.");
            return;
        }
        if (!hasPermission()) {
            call.reject("Sem permissão de Bluetooth.");
            return;
        }
        JSArray list = new JSArray();
        try {
            Set<BluetoothDevice> bonded = a.getBondedDevices();
            if (bonded != null) {
                for (BluetoothDevice d : bonded) {
                    JSObject o = new JSObject();
                    o.put("name", nameOf(d));
                    o.put("address", d.getAddress());
                    list.put(o);
                }
            }
        } catch (SecurityException e) {
            call.reject("Sem permissão de Bluetooth.");
            return;
        }
        JSObject r = new JSObject();
        r.put("devices", list);
        call.resolve(r);
    }

    @PluginMethod
    public void listen(PluginCall call) {
        BluetoothAdapter a = adapter();
        if (a == null || !a.isEnabled()) {
            call.reject("Ligue o Bluetooth do celular.");
            return;
        }
        if (!hasPermission()) {
            call.reject("Sem permissão de Bluetooth.");
            return;
        }
        closeAll();
        closing = false;
        final BluetoothServerSocket ss;
        try {
            ss = a.listenUsingRfcommWithServiceRecord("Manobra", APP_UUID);
        } catch (Exception e) {
            call.reject("Não foi possível criar a partida: " + e.getMessage());
            return;
        }
        synchronized (lock) {
            server = ss;
        }
        call.resolve();
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    BluetoothSocket s = ss.accept(); // espera o outro celular entrar
                    try { ss.close(); } catch (Exception ignore) { }
                    attach(s);
                } catch (Exception e) {
                    if (!closing) {
                        closeAll();
                        notifyListeners("disconnected", new JSObject());
                    }
                }
            }
        }).start();
    }

    @PluginMethod
    public void connect(final PluginCall call) {
        final String address = call.getString("address");
        final BluetoothAdapter a = adapter();
        if (address == null) {
            call.reject("Endereço do celular ausente.");
            return;
        }
        if (a == null || !a.isEnabled()) {
            call.reject("Ligue o Bluetooth do celular.");
            return;
        }
        if (!hasPermission()) {
            call.reject("Sem permissão de Bluetooth.");
            return;
        }
        closeAll();
        closing = false;
        new Thread(new Runnable() {
            @Override
            public void run() {
                Exception last = null;
                for (int attempt = 0; attempt < 3 && !closing; attempt++) {
                    BluetoothSocket s = null;
                    try {
                        BluetoothDevice d = a.getRemoteDevice(address);
                        try { a.cancelDiscovery(); } catch (Exception ignore) { }
                        s = d.createRfcommSocketToServiceRecord(APP_UUID);
                        s.connect();
                        attach(s);
                        JSObject r = new JSObject();
                        r.put("name", nameOf(d));
                        r.put("address", d.getAddress());
                        call.resolve(r);
                        return;
                    } catch (Exception e) {
                        last = e;
                        try { if (s != null) s.close(); } catch (Exception ignore) { }
                        try { Thread.sleep(700); } catch (InterruptedException ie) { break; }
                    }
                }
                call.reject("Não foi possível conectar. O outro celular criou a partida? (" + (last == null ? "cancelado" : last.getMessage()) + ")");
            }
        }).start();
    }

    @PluginMethod
    public void send(final PluginCall call) {
        final String data = call.getString("data");
        if (data == null) {
            call.reject("Sem dados.");
            return;
        }
        final OutputStream o;
        synchronized (lock) {
            o = out;
        }
        if (o == null) {
            call.reject("Sem conexão.");
            return;
        }
        // um único fio de envio mantém as mensagens na ordem
        sender.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    o.write((data + "\n").getBytes("UTF-8"));
                    o.flush();
                    call.resolve();
                } catch (Exception e) {
                    call.reject("Falha ao enviar: " + e.getMessage());
                }
            }
        });
    }

    @PluginMethod
    public void close(PluginCall call) {
        closeAll();
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        closeAll();
    }

    /* ---------- internos ---------- */

    private void attach(BluetoothSocket s) throws IOException {
        synchronized (lock) {
            socket = s;
            out = s.getOutputStream();
        }
        BluetoothDevice d = s.getRemoteDevice();
        JSObject o = new JSObject();
        o.put("name", nameOf(d));
        o.put("address", d.getAddress());
        notifyListeners("connected", o);
        final BluetoothSocket sock = s;
        new Thread(new Runnable() {
            @Override
            public void run() {
                readLoop(sock);
            }
        }).start();
    }

    private void readLoop(BluetoothSocket s) {
        try {
            BufferedReader r = new BufferedReader(new InputStreamReader(s.getInputStream(), "UTF-8"));
            String line;
            while ((line = r.readLine()) != null) {
                JSObject o = new JSObject();
                o.put("data", line);
                notifyListeners("message", o);
            }
        } catch (Exception e) {
            // conexão encerrada
        }
        boolean wasClosing = closing;
        closeAll();
        if (!wasClosing) {
            notifyListeners("disconnected", new JSObject());
        }
    }

    private void closeAll() {
        closing = true;
        BluetoothSocket s;
        BluetoothServerSocket ss;
        synchronized (lock) {
            s = socket;
            ss = server;
            socket = null;
            server = null;
            out = null;
        }
        try { if (ss != null) ss.close(); } catch (Exception ignore) { }
        try { if (s != null) s.close(); } catch (Exception ignore) { }
    }
}
