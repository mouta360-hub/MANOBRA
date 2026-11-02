"""Ajusta o projeto Android gerado pelo Capacitor.

Uso: python3 tools/patch_android.py <pasta_android> [--bluetooth | --no-bluetooth]

- trava o app na horizontal;
- instala o plugin ManobraScreen (tela sempre acesa durante o jogo), com ou sem Bluetooth;
- com --bluetooth (padrão): instala o plugin ManobraBluetooth, registra no MainActivity
  e pede as permissões de Bluetooth no manifesto;
- com --no-bluetooth: remove tudo isso (plano B se o plugin não compilar).
Pode ser executado várias vezes.
"""
import json
import os
import re
import sys

args = [a for a in sys.argv[1:] if not a.startswith("--")]
android = args[0] if args else "android"
with_bt = "--no-bluetooth" not in sys.argv

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(root, "capacitor.config.json"), encoding="utf-8") as f:
    app_id = json.load(f)["appId"]

manifest_path = os.path.join(android, "app", "src", "main", "AndroidManifest.xml")
java_dir = os.path.join(android, "app", "src", "main", "java", *app_id.split("."))

BT_BLOCK = (
    "    <!-- manobra-bluetooth -->\n"
    '    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />\n'
    '    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />\n'
    '    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />\n'
    '    <uses-feature android:name="android.hardware.bluetooth" android:required="false" />\n'
    "    <!-- /manobra-bluetooth -->\n"
)
MIC_BLOCK = (
    "    <!-- manobra-microphone -->\n"
    '    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n'
    '    <uses-feature android:name="android.hardware.microphone" android:required="false" />\n'
    "    <!-- /manobra-microphone -->\n"
)

# ---- AndroidManifest.xml
with open(manifest_path, encoding="utf-8") as f:
    manifest = f.read()
if "screenOrientation" not in manifest:
    manifest = manifest.replace("<activity", '<activity android:screenOrientation="fullSensor"', 1)
manifest = re.sub(r"[ \t]*<!-- manobra-bluetooth -->.*?<!-- /manobra-bluetooth -->\n?", "", manifest, flags=re.S)
manifest = re.sub(r"[ \t]*<!-- manobra-microphone -->.*?<!-- /manobra-microphone -->\n?", "", manifest, flags=re.S)
if with_bt:
    manifest = manifest.replace("</manifest>", BT_BLOCK + "</manifest>", 1)
manifest = manifest.replace("</manifest>", MIC_BLOCK + "</manifest>", 1)
with open(manifest_path, "w", encoding="utf-8") as f:
    f.write(manifest)

# ---- MainActivity.java e plugin
os.makedirs(java_dir, exist_ok=True)
plugin_dst = os.path.join(java_dir, "ManobraBluetoothPlugin.java")
with open(os.path.join(root, "native", "ManobraScreenPlugin.java"), encoding="utf-8") as f:
    screen_src = f.read().replace("__PACKAGE__", app_id)
with open(os.path.join(java_dir, "ManobraScreenPlugin.java"), "w", encoding="utf-8") as f:
    f.write(screen_src)
if with_bt:
    with open(os.path.join(root, "native", "ManobraBluetoothPlugin.java"), encoding="utf-8") as f:
        src = f.read().replace("__PACKAGE__", app_id)
    with open(plugin_dst, "w", encoding="utf-8") as f:
        f.write(src)
    main = (
        "package %s;\n\n"
        "import android.os.Bundle;\n"
        "import com.getcapacitor.BridgeActivity;\n\n"
        "public class MainActivity extends BridgeActivity {\n"
        "    @Override\n"
        "    public void onCreate(Bundle savedInstanceState) {\n"
        "        registerPlugin(ManobraBluetoothPlugin.class);\n"
        "        registerPlugin(ManobraScreenPlugin.class);\n"
        "        super.onCreate(savedInstanceState);\n"
        "    }\n"
        "}\n" % app_id
    )
else:
    if os.path.exists(plugin_dst):
        os.remove(plugin_dst)
    main = (
        "package %s;\n\n"
        "import android.os.Bundle;\n"
        "import com.getcapacitor.BridgeActivity;\n\n"
        "public class MainActivity extends BridgeActivity {\n"
        "    @Override\n"
        "    public void onCreate(Bundle savedInstanceState) {\n"
        "        registerPlugin(ManobraScreenPlugin.class);\n"
        "        super.onCreate(savedInstanceState);\n"
        "    }\n"
        "}\n" % app_id
    )
with open(os.path.join(java_dir, "MainActivity.java"), "w", encoding="utf-8") as f:
    f.write(main)

print("Android ajustado (%s Bluetooth, horizontal) em %s" % ("com" if with_bt else "sem", android))
