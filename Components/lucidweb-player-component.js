window.player = false;
(function(){
	"use strict";

	AFRAME.registerComponent('lucidweb-player', {
		schema:{
			idleTimeout: {type: "number", default: 4000},
			src: {type: "string", default: "https://lucidweb.io/embbed/testing_videos/Silence_cut1_2k.mp4"}
		},
		init: function() {
			var that = this;
			window.player = this;

			this.lastInteraction = Date.now();
			this.domainName = "https://lucidweb.io/";
			this.needModalSharing = false;
			this.frameCumul = 0;
			this.lastTime = 0;

			var src = this.el.getAttribute("src");
			if(src && src.indexOf("#") !== -1){
				this.video = document.querySelector(src);
			}
			else{
				this.video = document.createElement("video");
				this.video.setAttribute("webkit-playsinline", 'true');
				this.video.setAttribute("playsinline", 'true');
				this.video.crossOrigin = "anonymous";
				this.video.crossorigin = "anonymous";

				var texture = new THREE.VideoTexture( this.video );
				texture.minFilter = THREE.LinearFilter;
				texture.magFilter = THREE.LinearFilter;
				texture.format = THREE.RGBFormat;
				this.el.object3D.children[0].material.map = texture;
			}

			//Setting video source if provided in URL
			src = AFRAME.utils.getUrlParameter('src');
			if (src.length > 0){
				this.video.setAttribute("src", src);
			}
			else if(this.data.src !== ""){
				this.video.setAttribute("src", this.data.src);
			}
			else if(!this.el.getAttribute("src") || this.el.getAttribute("src") === ""){
				//We don't go further if we don't have a proper video url
				return;
			}

			//Setting up VR interface
			this.interface3D = document.getElementById("interface-3D");
			var cursor = document.getElementById("cursor");

			if (false){// debug on desktop
				this.interface3D.setAttribute("visible", "true");
				cursor.setAttribute("visible", "true");
			}
			this.createPlayerVRInterface();
			this.createLoadingSphere();

			if(document.querySelector("#slider")){
				document.querySelector("#slider").addEventListener("click", this.onSliderClick.bind(this));
				document.querySelector("#slider").addEventListener("touch", this.onSliderClick.bind(this));
			}

			this.registerListeners();

			this.el.setAttribute("lucidweb-device-handler", {});
			if(!AFRAME.utils.device.isMobile()){
				window.setTimeout(function() { window.player.playPauseVideo() }, 1000);
			}
		},
		createLoadingSphere: function(){
			var cam = document.querySelector("[camera]");

			this.loadingSphere = document.createElement("a-entity");
			this.loadingSphere.id = "loadingSphere";
			this.loadingSphere.setAttribute("geometry", {primitive:"sphere", radius:1, segmentsHeight: 16, segmentsWidth:32});
			this.loadingSphere.setAttribute("material", {wireframe:true, color: "#00ffce"});
			this.loadingSphere.setAttribute("position", "0 0 -5");

			cam.appendChild(this.loadingSphere);
		},
		update: function(data){
			if(data.src && this.data.src !== this.video.getAttribute("src")){
				this.video.setAttribute("src", this.data.src);
			}
		},
		registerListeners: function(){
			var that = this;
			document.querySelector('a-scene').addEventListener('enter-vr', this.onEnterVR.bind(this));
			document.querySelector('a-scene').addEventListener('exit-vr', this.onExitVR.bind(this));

			this.onCanPlayCB = function(){ that.onCanPlay(); };
			this.video.addEventListener("canplay", this.onCanPlayCB);

			this.video.addEventListener("ended", this.onEnded.bind(this));


			document.querySelector("#enterVR").addEventListener("click", this.enterVR.bind(this));

			document.addEventListener("mousemove", this.onMouseActivity.bind(this));
			document.addEventListener("click", this.onMouseActivity.bind(this));
			document.addEventListener("touchstart", this.onMouseActivity.bind(this));
		},
		createPlayerVRInterface: function(){
			var that = this;
			var button;
			var spacing = 1.5;
			var extension = ".png";
			var path = this.domainName + "Images/Player_Icons/";
			var buttons = [
				{ name: "volume-down", clickEvent: "volumeDown"},
				{ name: "play", clickEvent: "playPauseVideo"},
				{ name: "volume-up", clickEvent: "setVolumeUp"}
			];

			var posX = -1.5;
			buttons.forEach(function(element) {
				button = document.createElement("a-entity");
				button.id = "lucidwebBtn_" + element.name;
				button.setAttribute("lucidweb-gui-button", {
					src : path + element.name + extension,
					clickEvent : element.clickEvent
				});
				button.setAttribute("position", posX +" 0 0");
				that.interface3D.appendChild(button);
				posX += spacing;
			});

			this.slider = document.createElement("a-entity");
			this.slider.setAttribute("lucidweb-gui-slider", {});
			this.slider.setAttribute("position", "0 -1 0");
			this.interface3D.appendChild(this.slider);
		},
		enterVR: function(){
			AFRAME.scenes[0].enterVR();

			if(AFRAME.utils.device.isMobile()){
				this.playPauseVideo(true);
			}
		},
		onEnterVR: function() {
			document.querySelector("#interface").dataset.state = "hidden";
			this.interface3D.setAttribute("visible", "true");
			cursor.setAttribute("visible", "true");

			if(typeof ga !== 'undefined'){
				ga('send', 'event', 'VR', 'Enter');
			}
		},
		onExitVR: function() {
			document.querySelector("#interface").dataset.state = "visible";
			this.interface3D.setAttribute("visible", "false");
			cursor.setAttribute("visible", "false");

			if(this.needModalSharing){
				this.showModalShare();
				this.needModalSharing = false;
			}

			this.endText.setAttribute("visible", false);

			if(typeof ga !== 'undefined'){
				ga('send', 'event', 'VR', 'Exit');
			}
		},
		onCanPlay: function(){
			document.querySelector("#interface").dataset.state = "visible";
			this.video.removeEventListener("canplay", this.onCanPlayCB);

			//Setting video start time
			var time = parseFloat(AFRAME.utils.getUrlParameter('time'));
			if (time && time > 0){
				this.seek(time);
			}
			this.loadingSphere.setAttribute("visible", false);
		},
		onEnded: function(){
			document.querySelector("#playpause").src = this.domainName + "Images/Player_Icons/play.svg";
			document.querySelector("#lucidwebBtn_play").children[0].setAttribute("src", this.domainName + "Images/Player_Icons/play.png");
			if(AFRAME.scenes[0].states[0] === "vr-mode"){
				this.interface3D.setAttribute("visible", "true");
				cursor.setAttribute("visible", "true");
			}
			else{
				document.querySelector("#interface").dataset.state = "visible";
			}

			if(AFRAME.scenes[0].states[0] === "vr-mode"){
				this.needModalSharing = true;

				var cam = document.querySelector("[camera]");
				this.endText = document.createElement("a-entity");
				this.endText.id = "endText";
				this.endText.setAttribute("position", "0 0 -2");
				this.endText.setAttribute("geometry", {primitive:"plane", width:2.5, height:0.5});
				this.endText.setAttribute("material", {opacity:0.5});
				cam.appendChild(this.endText);

				var text1 = document.createElement("a-entity");
				text1.id = "text1";
				text1.setAttribute("text", {value:"Thank you for having this experience."});
				text1.setAttribute("text", {align: "center", width:3, alphaTest: 0.1, color: "#000"});
				text1.setAttribute("position", "0 0.15 0.1");
				this.endText.appendChild(text1);

				var text2 = document.createElement("a-entity");
				text2.id = "text2";
				text2.setAttribute("text", {value:"Feel free to remove the headset now."});
				text2.setAttribute("text", {align: "center", width:3, alphaTest: 0.1, color: "#000"});
				text2.setAttribute("position", "0 -0.15 0.1");
				this.endText.appendChild(text2);

				setTimeout(function(){
					this.endText.setAttribute("visible", false);
				}, 10000);
			}
		},
		onMouseActivity: function(evt){
			this.lastInteraction = Date.now();

			if(AFRAME.scenes[0].states[0] === "vr-mode"){
				this.interface3D.setAttribute("visible", "true");
				cursor.setAttribute("visible", "true");
			}
			else{
				document.querySelector("#interface").dataset.state = "visible";
			}

			if(evt.type === "click" && evt.target.tagName === "CANVAS"){
				if(document.querySelector("#modalShare").style.display === "block"){
					this.hideModalShare();
				}
			}
		},
		onUIHover: function(btn){ btn.src = btn.src.replace(".svg", "-hover.svg"); },
		onUIHoverLeft: function(btn){ btn.src = btn.src.replace("-hover.svg", ".svg"); },
		playPauseVideo: function(forcePlay) {
			if(this.video.paused || forcePlay){
				document.querySelector("#playpause").src = this.domainName + "Images/Player_Icons/pause.svg";
				this.video.play();
				document.getElementById("mobileUserAction").style.display = "none";
				document.querySelector("#lucidwebBtn_play").children[0].setAttribute("src", this.domainName + "Images/Player_Icons/pause.png");
			}
			else{
				this.video.pause();
				document.querySelector("#playpause").src = this.domainName + "Images/Player_Icons/play.svg";
				document.querySelector("#lucidwebBtn_play").children[0].setAttribute("src", this.domainName + "Images/Player_Icons/play.png");
			}
		},
		seek: function(time) {
			this.video.currentTime = time;
			this.updateUI();
		},
		seekPercent: function(percent){
			percent = (percent > 1 ? percent / 100 : percent);
			var time = (isNaN(this.video.duration) ? 0 : percent * this.video.duration);
			this.seek(time);
		},
		seekForward: function() {
			this.seek(this.video.currentTime + 15);
		},
		seekBackward: function() {
			this.seek(this.video.currentTime - 15);
		},
		stopVideo: function() {
			this.pause();
			this.seek(0.001);
		},
		volumeChange: function(newValue) {
			this.video.volume = newValue;
		},
		setVolumeOnOff: function() {
			if(document.querySelector("#volumeOnOff").dataset.state === "volumeOff"){
				this.video.volume = 0;
				document.querySelector("#volumeOnOff").dataset.state = "volumeOn";
				document.querySelector("#volumeOnOff").src = this.domainName + "Images/Player_Icons/volume-up.svg";
			}
			else{
				this.video.volume = 1;
				document.querySelector("#volumeOnOff").dataset.state = "volumeOff";
				document.querySelector("#volumeOnOff").src = this.domainName + "Images/Player_Icons/volume-off.svg";
			}
		},
		setVolumeUp: function() {
			this.video.volume += 0.1;
		},
		setVolumeDown: function() {
			this.video.volume -= 0.1;
		},
		onSliderClick: function(evt){
			var percent = Math.floor((evt.clientX / evt.currentTarget.offsetWidth) * 1000) / 1000;
			this.seekPercent(percent);
		},
		updateUI: function(){
			var video = window.player.video;
			var percentPlayed = (isNaN(video.duration) ? 0 : Math.floor((video.currentTime / video.duration) * 1000) / 1000);

			//Updating VR UI
			if(this.slider && this.slider.components["lucidweb-gui-slider"]){
				this.slider.components["lucidweb-gui-slider"].updateSlider(percentPlayed);
			}

			//Updating 2D UI
			if(document.querySelector("#sliderProgress")){
				document.querySelector("#sliderProgress").style.width = (percentPlayed * 100) + "%"
			}
		},
		getShareLink: function(){
			return (window.location.href.replace(window.location.hash, "") +	"&time=" + Math.round(this.video.currentTime * 100) / 100);
		},
		getShareMessage: function(){
			return "Check this 360° video on " + escape(this.getShareLink());
		},
		showModalShare: function(msg) {
			var that = this;
			function copyLink(){
			}
			function copyLink(){
				setTimeout(function(){
					document.querySelector("#shareLinkInput").style.display = "block";
					var shareLinkElt = document.querySelector("#shareLinkInput");
					shareLinkElt.value = that.getShareLink();
					shareLinkElt.select();

					try {
						var status = document.execCommand('copy');
						if(!status){
							console.error("Cannot copy text");
						}else{
							console.log("The text is now on the clipboard");
						}
					} catch (err) {
						console.log('Unable to copy.');
					}
					document.querySelector("#copyLinkBtn").src = this.domainName + "Images/Share_Icons/Link-Form.svg";
				}, 500);

				document.querySelector("#copyLinkBtn").src = this.domainName + "Images/Share_Icons/Copy_Link_Button2.svg";
				document.querySelector("#copyLinkBtn").removeEventListener("click", copyLinkBtn);
			}

			document.getElementById("modalShare").style.display = "block";
			document.querySelector("#copyLinkBtn").addEventListener("click", copyLink);
		},
		shareLinkFacebook: function() {
			window.open("https://www.facebook.com/sharer/sharer.php?u=" +  this.getShareLink(), "_blank");
		},
		shareLinkTwitter: function() {
			window.open("https://twitter.com/intent/tweet?text=" + this.getShareMessage() + "&via=lucidw3b", "_blank");
		},
		shareLinkGoogleplus: function() {
			window.open("https://plus.google.com/share?url=" +  this.getShareLink(), "_blank");
		},
		shareLinkEmail: function() {
			window.open("mailto:?subject=" +  this.getShareLink(), "_blank");
		},
		hideModalShare: function() {
			document.getElementById("modalShare").style.display = "none";
			document.querySelector("#copyLinkBtn").dataset.state = "copyLink";
			document.querySelector("#shareLinkInput").style.display = "none";
		},
		checkIsLoading: function(){
			if(this.video.ended || this.video.paused){
				return false;
			}

			var isLoading = (this.video.buffered.length && this.video.currentTime > this.video.buffered.end(this.video.buffered.length - 1));
			isLoading     = isLoading || this.video.readyState !== 4 || this.lastTime === this.video.currentTime;

			if(isLoading){
				this.frameCumul++;
				if(this.frameCumul > 30){
					return true;
				}
				return false;
			}
			else{
				this.frameCumul = 0;
				return false;
			}
		},
		tick: function(){
			if(!this.video.paused){
				this.updateUI();
				if(Date.now() - this.lastInteraction > this.data.idleTimeout){
					document.querySelector("#interface").dataset.state = "hidden";

					this.interface3D.setAttribute("visible", "false");
					cursor.setAttribute("visible", "false");
				}
			}

			if(this.loadingSphere){
				if(this.checkIsLoading()){
					this.loadingSphere.object3D.rotateY(Math.PI/360);
					this.loadingSphere.setAttribute("visible", "true");
				}
				else{
					this.loadingSphere.setAttribute("visible", "false");
				}
			}

			this.lastTime = this.video.currentTime;
		}
	});
})();
