(function(){
	"use strict";
	window.addEventListener("load", function(){
		(function(i, s, o, g, r, a, m) {
			//Check if users asked not to be tracked
			if(navigator.doNotTrack !== "1"){
				i['GoogleAnalyticsObject'] = r;
				i[r] = i[r] || function() {
					(i[r].q = i[r].q || []).push(arguments)
				}, i[r].l = 1 * new Date();
				a = s.createElement(o),
				m = s.getElementsByTagName(o)[0];
				a.async = 1;
				a.src = g;
				m.parentNode.insertBefore(a, m)
			}
			else{
				//Prevent from errors of calling ga out of this script
				window.ga = function(){};
			}
		})(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');

		ga('create', 'UA-108233711-1', 'auto');
		ga('send', 'pageview');
		// End Google Analytics
		ga('send', 'event', 'testing', 'OK');


		//Global site tag (gtag.js) - Google Analytics

		//Check if users asked not to be tracked
		if(navigator.doNotTrack !== "1"){
			const script = document.createElement('script');
			document.body.appendChild(script);
			script.async = true;
			script.onload = function(){
				window.dataLayer = window.dataLayer || [];

				function gtag() { dataLayer.push(arguments); }
				gtag('js', new Date());

				gtag('config', 'UA-108233711-1');
			};
			script.onerror = function(err){console.log("Error Loading Google Tag manager", err)};
			script.src = "https://www.googletagmanager.com/gtag/js?id=UA-108233711-1";
		}
		else{
			//Prevent from errors of calling gtag out of this script
			window.gtag = function(){};
		}
	});
})()
