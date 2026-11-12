package com.hpatter9.lastkeep;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideBars();
        // WAVE-DELAY (docs/notes/wave-delay.md): the page's own process is kept at the app's priority while the app is in front, and is
        // not let drop when the view is covered for a moment: a renderer the system has set back runs the game in fits and starts.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);
        }
        // PHONE-BACK (docs/notes/phone-back.md): the system Back (the button and the back gesture) never closes the game. Capacitor's bridge
        // leaves Back to the activity, which would finish; instead it goes to the page, which closes the topmost thing open, goes to the
        // Battle tab, or opens the place's own leave or pause control (`phoneBack.ts`). The app is left with the home button or the task list.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() == null) return;
                WebView web = getBridge().getWebView();
                if (web != null) web.evaluateJavascript("window.__phoneBack && window.__phoneBack()", null);
            }
        });
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars();
    }

    // Full-screen: the status and navigation bars stay hidden (a swipe from the edge shows them for a moment).
    private void hideBars() {
        View decor = getWindow().getDecorView();
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), decor);
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.systemBars());
    }
}
