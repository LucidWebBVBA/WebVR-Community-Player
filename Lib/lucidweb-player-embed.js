(function(){
	"use strict";

	var LucidwebEmbed = function(){
		this.mainScript = "https://aframe.io/releases/0.7.0/aframe.js";
		var path = (location.origin.indexOf("localhost") !== -1 ? "http://localhost:3000/" : "https://lucidweb.io/communityplayer/");
		this.secondaryScripts = [
			path + "Components/lucidweb-device-handler-component.js",
			path + "Components/lucidweb-player-component.js",
			path + "Components/lucidweb-ui-component.js",
			path + "Embed/lucidweb-player-analytics.js"
		];
		this.htmlFiles = [
			path + "Embed/lucidweb-player-ui.html",
			path + "Embed/lucidweb-player-ascene.html"
		];
		this.styleSheet = path + "style.css";

		window.addEventListener("load", this.onWindowLoaded.bind(this));
	}

	LucidwebEmbed.prototype.onWindowLoaded = function(){
		var lucidwebPlayerDiv = document.querySelector("#lucidweb-player");
		if(lucidwebPlayerDiv){
			this.init({
				src : lucidwebPlayerDiv.getAttribute("src")
			})
		}
	}

	LucidwebEmbed.prototype.init = function(params){
		var that = this;

		this.loadScripts().then(function(){
			document.querySelector("a-scene").setAttribute("embedded", true);
			AFRAME.scenes[0].resize();
			document.querySelector("[lucidweb-player]").setAttribute("lucidweb-player", { src : params.src});
			ga('send', 'event', 'videoPlayed', params.src);
			ga('send', 'event', 'domain', location.href);
			that.registerExtraUI();
		}).catch((err) => {
		  console.log("Error in loading lucidweb-player scripts", err);
		});
	}

	LucidwebEmbed.prototype.registerExtraUI = function(){
		var buttonEnterVR = document.querySelector("#lucidweb-player-start");
		if(buttonEnterVR){
			buttonEnterVR.addEventListener("click", player.enterVR);
		}
	}

	LucidwebEmbed.prototype.loadScripts = function(){
		var that = this;
		var promises = [];
		var parentElt = document.querySelector("#lucidweb-player");

		function appendScript(params){
			return new Promise((resolve, reject) => {
				const script = document.createElement('script');
				params.parentElt.appendChild(script);
				script.onload = resolve;
				script.onerror = reject;
				script.src = params.src;
			});
		}

		function appendHTML(params){
			return new Promise((resolve, reject) => {
				return fetch(params.src).then(function(response){
					return response.text();
				}).then(function(htmldata){
					var elt = document.createElement('div');
					elt.innerHTML = htmldata;

			    var template = elt.querySelector('template');
			    var clone = document.importNode(template.content, true);
			    params.parentElt.appendChild(clone);
					resolve();
				}).catch(reason => {
				  console.log("Error in loading lucidweb-player HTML", reason);
					reject();
				});
			})
		}

		function appendCSS(params){
			return new Promise((resolve, reject) => {
		    const link  = document.createElement('link');
		    link.rel  = 'stylesheet';
		    link.type = 'text/css';
		    link.href = params.src;
		    link.media = 'all';
		    params.parentElt.appendChild(link);
				resolve();
			});
		}

		return new Promise((resolve, reject) => {
			//We cannot use async/await because of Samsung VR as of the 27.11.2017
			//So we have to use callback
			appendScript({
				parentElt : document.head,
				src 			: that.mainScript
			}).then(() => {
				appendCSS({
					parentElt : document.head,
					src 			: that.styleSheet
				}).then(() => {
					appendScript({
						parentElt : parentElt,
						src 			: that.secondaryScripts[0]
					}).then(() => {
						appendScript({
							parentElt : parentElt,
							src 			: that.secondaryScripts[1]
						}).then(() => {
							appendScript({
								parentElt : parentElt,
								src 			: that.secondaryScripts[2]
							}).then(() => {
								appendScript({
									parentElt : parentElt,
									src 			: that.secondaryScripts[3]
								}).then(() => {
									appendHTML({
										parentElt : parentElt,
										src 			: that.htmlFiles[0]
									}).then(() => {
										appendHTML({
											parentElt : parentElt,
											src 			: that.htmlFiles[1]
										}).then(() => {
											resolve();
										}).catch((err) => {
											reject(err);
										});
									});
								});
							});
						});
					});
				});
			});
			return true;
		});
	}

	new LucidwebEmbed();
})();
