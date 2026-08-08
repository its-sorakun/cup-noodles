package com.example.cupnoodles

import android.app.Activity
import android.content.Context
import android.os.Bundle
import android.view.View
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout

class MainActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val webView: WebView = findViewById(R.id.webView)
        val connectionLayout: LinearLayout = findViewById(R.id.connectionLayout)
        val ipAddressInput: EditText = findViewById(R.id.ipAddressInput)
        val connectButton: Button = findViewById(R.id.connectButton)

        // Setup WebView settings for a modern web app
        val webSettings: WebSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.mediaPlaybackRequiresUserGesture = false // Crucial for auto-playing media
        
        // Ensure links open within the WebView, not the external browser
        webView.webViewClient = object : WebViewClient() {}

        // Load saved IP address if it exists
        val sharedPref = getSharedPreferences("CupNoodles", Context.MODE_PRIVATE)
        val savedIp = sharedPref.getString("SAVED_IP", "")
        
        if (!savedIp.isNullOrEmpty()) {
            ipAddressInput.setText(savedIp)
        }

        connectButton.setOnClickListener {
            val ipAddress = ipAddressInput.text.toString().trim()
            if (ipAddress.isNotEmpty()) {
                // Save it for next time
                with(sharedPref.edit()) {
                    putString("SAVED_IP", ipAddress)
                    apply()
                }

                // Format the URL
                val url = if (ipAddress.startsWith("http://") || ipAddress.startsWith("https://")) {
                    ipAddress
                } else {
                    "http://$ipAddress"
                }

                // Switch UI
                connectionLayout.visibility = View.GONE
                webView.visibility = View.VISIBLE

                // Load the Cup Noodles server
                webView.loadUrl(url)
            }
        }
    }
    
    // Handle Android hardware back button
    override fun onBackPressed() {
        val webView: WebView = findViewById(R.id.webView)
        if (webView.visibility == View.VISIBLE && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
