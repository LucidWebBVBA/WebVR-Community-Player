//Creating a global variable for the player
window.player = false;
(function(){
	"use strict";

	/**
	 * A-Frame component to handle 360° videos and handle 2D-VR UI
	 * @type {Object}
	 */
	AFRAME.registerComponent('lucidweb-player', {
		schema:{
			idleTimeout: {type: "number", default: 4000},//Time of idle after which the UI disappears
			src: {type: "string", default: "https://lucidweb.io/embbed/testing_videos/Silence_cut1_2k.mp4"}//Default video URL
		},
		/**
		 * Called once at the initialisation of the component
		 * @return {[type]} [description]
		 */
		init: function() {
			var that = this;
			window.player = this;

			this.lastInteraction = Date.now();
			this.domainName = "https://lucidweb.io/";
			this.needModalSharing = false;
			this.frameCumul = 0;
			this.lastTime = 0;

			this.initialInputReceived = false;

			var src = this.el.getAttribute("src");
			if(src && src.indexOf("#") !== -1){
				//Case where the videosphere component has an "src" attribute
				this.video = document.querySelector(src);
			}
			else{
				//Otherwise we need to create the video texture ourselves
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
				//Video source provided by attribute setting on [lucidweb-player] component
				this.video.setAttribute("src", this.data.src);
			}
			else if(!this.el.getAttribute("src") || this.el.getAttribute("src") === ""){
				//We don't go further if we don't have a proper video url
				return;
			}

			//Hack for mobile autoplay
			if(AFRAME.utils.device.isMobile()){
				this.video.muted = true;

				document.querySelector("#volumeOnOff").dataset.state = "volumeOff";
				document.querySelector("#volumeOnOff").src = this.domainName + "Images/Player_Icons/volume-off.svg";
				document.querySelector("#tapToUnmute").classList.remove("hide");
				document.querySelector("#tapToUnmute").addEventListener("click", function(){
					that.setVolumeOnOff({forceOn: true});
					document.querySelector("#tapToUnmute").classList.add("hide");
				});

				this.createInitialPresentation();
			}

			//Setting up VR interface
			this.interface3D = document.getElementById("interface-3D");
			this.createPlayerVRInterface();

			this.createLoadingSphere();

			//Handle interactions with the 2D slider
			if(document.querySelector("#slider")){
				document.querySelector("#slider").addEventListener("click", this.onSliderClick.bind(this));
				document.querySelector("#slider").addEventListener("touch", this.onSliderClick.bind(this));
			}

			this.registerListeners();

			this.el.setAttribute("lucidweb-device-handler", {});

			//Playing automatically the video
			window.setTimeout(function() { that.video.play(); }, 1000);
		},
		/**
		 * Set up an initial sphere and button in the scene to present something else than black screen
		 * @return {[type]} [description]
		 */
		createInitialPresentation: function(){
			var cam = document.querySelector("[camera]");
			var playIncentiveImage = document.createElement("a-image");
			playIncentiveImage.id = "playIncentiveImage";
			playIncentiveImage.setAttribute("position", "0 0 -2");
			playIncentiveImage.setAttribute("src", this.domainName + "Images/Player_Icons/play-hover.svg");
			cam.appendChild(playIncentiveImage);
		},
		/**
		 * Called when the component's properties are updated
		 * @param  {[type]} data [description]
		 * @return {[type]}      [description]
		 */
		update: function(data){
			//Only update if video source has been set on purpose
			if(data.src && this.data.src !== this.video.getAttribute("src")){
				this.video.setAttribute("src", this.data.src);
			}
		},
		/**
		 * Create a sphere to display when the video is loading
		 * @return {[type]} [description]
		 */
		createLoadingSphere: function(){
			var cam = document.querySelector("[camera]");

			this.loadingSphere = document.createElement("a-entity");
			this.loadingSphere.id = "loadingSphere";
			this.loadingSphere.setAttribute("geometry", {primitive:"sphere", radius:1, segmentsHeight: 16, segmentsWidth:32});
			this.loadingSphere.setAttribute("material", {wireframe:true, color: "#00ffce"});
			this.loadingSphere.setAttribute("position", "0 0 -5");

			cam.appendChild(this.loadingSphere);
		},
		/**
		 * Register listeners for scene interaction and video state
		 * @return {[type]} [description]
		 */
		registerListeners: function(){
			var that = this;
			document.querySelector('a-scene').addEventListener('enter-vr', this.onEnterVR.bind(this));
			document.querySelector('a-scene').addEventListener('exit-vr', this.onExitVR.bind(this));

			//Manage media event listeners
			this.onCanPlayCB = function(){ that.onCanPlay(); };
			this.video.addEventListener("canplay", this.onCanPlayCB);
			this.video.addEventListener("ended", this.onEnded.bind(this));
			this.video.addEventListener("error", this.onError.bind(this));
			this.video.addEventListener("playing", this.onPlayPause.bind(this));
			this.video.addEventListener("pause", this.onPlayPause.bind(this));
			this.video.addEventListener("play", this.onPlayPause.bind(this));


			document.querySelector("#enterVR").addEventListener("click", this.enterVR.bind(this));

			document.querySelector("a-scene").parentEl.addEventListener("mousemove", this.onMouseActivity.bind(this));
			document.querySelector("a-scene").parentEl.addEventListener("click", this.onMouseActivity.bind(this));
			document.querySelector("a-scene").parentEl.addEventListener("touchstart", this.onMouseActivity.bind(this));
		},
		/**
		 * Create the 3D interfaces for the user to interact with the video while in VR mode
		 * @return {[type]} [description]
		 */
		createPlayerVRInterface: function(){
			var that = this;
			var button;
			var spacing = 1.5;
			var extension = ".png";
			var path = this.domainName + "Images/Player_Icons/";
			var buttons = [
				{ name: "volume-down", clickEvent: "setVolumeDown"},
				{ name: "play", clickEvent: "playPauseVideo"},
				{ name: "volume-up", clickEvent: "setVolumeUp"}
			];

			//Create a [lucidweb-gui-button] component for each VR button
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

			//Create the slider to change video's current time
			this.slider = document.createElement("a-entity");
			this.slider.setAttribute("lucidweb-gui-slider", {});
			this.slider.setAttribute("position", "0 -1 0");
			this.interface3D.appendChild(this.slider);
		},
		/**
		 * Called when clicking on the "Enter VR" button, interfacing AFrame's enterVR function
		 * @return {[type]} [description]
		 */
		enterVR: function(){
			AFRAME.scenes[0].enterVR();

			//Force playing the video if using mobile, to squeeze the needed user interaction to play media
			if(!this.initialInputReceived && AFRAME.utils.device.isMobile()){
				this.playPauseVideo({fromClick: true});
				this.video.muted = false;
				document.querySelector("#tapToUnmute").classList.add("hide");
			}
		},
		/**
		 * Called upon entering the VR state
		 * @return {[type]} [description]
		 */
		onEnterVR: function() {
			//Hiding 2D UI and showing the VR one
			document.querySelector("#interface").dataset.state = "hidden";
			this.interface3D.setAttribute("visible", "true");
			document.getElementById("cursor").setAttribute("visible", "true");

			if(typeof ga !== 'undefined'){
				ga('send', 'event', 'VR', 'Enter');
			}
		},
		/**
		 * Called when exiting the VR state
		 * @return {[type]} [description]
		 */
		onExitVR: function() {
			//Hiding the VR UI and showing the 2D one
			this.interface3D.setAttribute("visible", "false");
			document.getElementById("cursor").setAttribute("visible", "false");
			document.querySelector("#interface").dataset.state = "visible";

			//Shows the share modal if the user has looked the video till the end
			if(this.needModalSharing){
				this.showModalShare();
				this.needModalSharing = false;
			}

			//Hide the user's indication to remove his(/her) HMD, as he(/she)'s leaving VR
			if(this.videoEndImage){
				this.videoEndImage.setAttribute("visible", false);
			}

			if(typeof ga !== 'undefined'){
				ga('send', 'event', 'VR', 'Exit');
			}
		},
		/**
		 * Called when the video has gathered enough data to play the first frames
		 * @return {[type]} [description]
		 */
		onCanPlay: function(){
			document.querySelector("#interface").dataset.state = "visible";
			this.video.removeEventListener("canplay", this.onCanPlayCB);

			//Setting video start time from URL
			var time = parseFloat(AFRAME.utils.getUrlParameter('time'));
			if (time && time > 0){
				this.seek(time);
			}
			this.loadingSphere.setAttribute("visible", false);
		},
		/**
		 * Called when the video ended
		 * @return {[type]} [description]
		 */
		onEnded: function(){
			var that = this;
			//Reset and show the UI for the user to understand that the video is finished
			document.querySelector("#playpause").src = this.domainName + "Images/Player_Icons/play.svg";
			document.querySelector("#lucidwebBtn_play").children[0].setAttribute("src", this.domainName + "Images/Player_Icons/play.png");
			if(AFRAME.scenes[0].states[0] === "vr-mode"){
				this.interface3D.setAttribute("visible", "true");
				document.getElementById("cursor").setAttribute("visible", "false");

				this.needModalSharing = true;

				//If in VR mode, shows a message indicating the user can leave VR state
				var cam = document.querySelector("[camera]");
				this.videoEndImage = document.createElement("a-image");
				this.videoEndImage.id = "videoEndImage";
				this.videoEndImage.setAttribute("position", "0 0 -2");
				this.videoEndImage.setAttribute("src", this.domainName + "Images/End_Screens/end-screen.png");
				this.videoEndImage.setAttribute("width", 1.77);
				cam.appendChild(this.videoEndImage);

				setTimeout(function(){
					that.videoEndImage.setAttribute("visible", false);
					document.getElementById("cursor").setAttribute("visible", "true");
				}, 10000);
			}
			else{
				document.querySelector("#interface").dataset.state = "visible";
			}
		},
		/**
		 * Function handling media error
		 * @param  {[type]} data [description]
		 * @return {[type]}      [description]
		 */
		onError: function(data){
			console.log("Error occured while handling media", data);
		},
		onPlayPause: function(){
			if(this.video.paused){
				document.querySelector("#playpause").src = this.domainName + "Images/Player_Icons/play.svg";
				document.querySelector("#lucidwebBtn_play").children[0].setAttribute("src", this.domainName + "Images/Player_Icons/play.png");
			}
			else{
				document.querySelector("#playpause").src = this.domainName + "Images/Player_Icons/pause.svg";
				document.getElementById("mobileUserAction").style.display = "none";
				document.querySelector("#lucidwebBtn_play").children[0].setAttribute("src", this.domainName + "Images/Player_Icons/pause.png");

				if(document.querySelector("#playIncentiveImage")){
					document.querySelector("#playIncentiveImage").setAttribute("visible", false);
				}
				document.querySelector("#backgroundSphere").setAttribute("visible", false);
			}
		},
		/**
		 * Called when the user interacted with the player's area, to get out of Idle state
		 * @param  {[type]} evt [description]
		 * @return {[type]}     [description]
		 */
		onMouseActivity: function(evt){
			this.lastInteraction = Date.now();

			if(AFRAME.scenes[0].states[0] === "vr-mode"){
				this.interface3D.setAttribute("visible", "true");
				cursor.setAttribute("visible", "true");

				//Hide the user's indication to remove his(/her) HMD, as he(/she)'s leaving VR
				if(this.videoEndImage){
					this.videoEndImage.setAttribute("visible", false);
					document.getElementById("cursor").setAttribute("visible", "true");
				}
			}
			else{
				document.querySelector("#interface").dataset.state = "visible";
			}

			if(evt.type === "click" && evt.target.tagName === "CANVAS"){
				if(document.querySelector("#modalShare").style.display === "block"){
					this.hideModalShare();
				}
				if(!this.initialInputReceived){
					this.playPauseVideo({forcePlay: true, fromClick: true});
				}
			}
		},
		/**
		 * Called when the user's hover (in and out) the 2D UI
		 * @param  {[type]} btn [description]
		 * @return {[type]}     [description]
		 */
		onUIHover: function(btn){ btn.src = btn.src.replace(".svg", "-hover.svg"); },
		onUIHoverLeft: function(btn){ btn.src = btn.src.replace("-hover.svg", ".svg"); },
		/**
		 * Method used to toggle the video state and update the UI accordingly
		 * @param  {boolean} forcePlay force the player to play to avoid accidental pause
		 * @return {[type]}           [description]
		 */
		playPauseVideo: function(params) {
			params = params || {};
			if(this.video.paused || params.forcePlay){
				this.video.play();
				document.querySelector("#playpause").src = this.domainName + "Images/Player_Icons/pause.svg";
				document.getElementById("mobileUserAction").style.display = "none";
				document.querySelector("#lucidwebBtn_play").children[0].setAttribute("src", this.domainName + "Images/Player_Icons/pause.png");
			}
			else{
				this.video.pause();
				document.querySelector("#playpause").src = this.domainName + "Images/Player_Icons/play.svg";
				document.querySelector("#lucidwebBtn_play").children[0].setAttribute("src", this.domainName + "Images/Player_Icons/play.png");
			}

			if(params.fromClick && this.video.muted && this.video.volume === 1){
				this.initialInputReceived = true;
				this.video.muted = false;
				this.setVolumeOnOff({forceOn: true});
				document.querySelector("#tapToUnmute").classList.add("hide");
				document.querySelector("#playIncentiveImage").setAttribute("visible", false);
				document.querySelector("#backgroundSphere").setAttribute("visible", false);
			}
		},
		/**
		 * Move the video current Time
		 * @param  {float} time time to reach in the video (if > video.duration, will end the video)
		 * @return {[type]}      [description]
		 */
		seek: function(time) {
			this.video.currentTime = time;
			this.updateUI();
		},
		/**
		 * Seek to a certain percentage of the video
		 * Used by the UI sliders
		 * @param  {int} percent percentage of the video we wanna reach
		 * @return {[type]}         [description]
		 */
		seekPercent: function(percent){
			percent = (percent > 1 ? percent / 100 : percent);
			var time = (isNaN(this.video.duration) ? 0 : percent * this.video.duration);
			this.seek(time);
		},
		/**
		 * Seek 15 seconds in the video
		 * @return {[type]} [description]
		 */
		seekForward: function() {
			this.seek(this.video.currentTime + 15);
		},
		/**
		 * Seek back 15 seconds in the video
		 * @return {[type]} [description]
		 */
		seekBackward: function() {
			this.seek(Math.max(0, this.video.currentTime - 15));
		},
		/**
		 * Stop the video playback and goes back to its beginning
		 * @return {[type]} [description]
		 */
		stopVideo: function() {
			this.pause();
			this.seek(0.001);
		},
		/**
		 * Set the video's volume to a different value
		 * @param  {float} newValue desired audio value (between 0 and 1)
		 * @return {[type]}          [description]
		 */
		volumeChange: function(newValue) {
			this.video.volume = newValue;
			this.video.muted = false;
		},
		/**
		 * Turn off the video's volume and update the UI accordingly
		 * @return {[type]} [description]
		 */
		setVolumeOnOff: function(params) {
			params = params || {};
			if(params.forceOn || (document.querySelector("#volumeOnOff").dataset.state === "volumeOff" && !params.forceOff)){
				this.video.volume = 1;
				document.querySelector("#volumeOnOff").dataset.state = "volumeOn";
				document.querySelector("#volumeOnOff").src = this.domainName + "Images/Player_Icons/volume-up.svg";
			}
			else{
				this.video.volume = 0;
				document.querySelector("#volumeOnOff").dataset.state = "volumeOff";
				document.querySelector("#volumeOnOff").src = this.domainName + "Images/Player_Icons/volume-off.svg";
			}
			if(this.video.muted){
				this.video.muted = false;
				document.querySelector("#tapToUnmute").classList.add("hide");
			}
		},
		/**
		 * Raise the video's volume by 10%
		 * @return {[type]} [description]
		 */
		setVolumeUp: function() {
			this.video.volume += 0.1;
			this.video.muted = false;
		},
		/**
		 * Lower the video's volume by 10%
		 * @return {[type]} [description]
		 */
		setVolumeDown: function() {
			this.video.volume -= 0.1;
			this.video.muted = false;
		},
		/**
		 * Handles interaction with the slider to change video currentTime
		 * @param  {[type]} evt [description]
		 * @return {[type]}     [description]
		 */
		onSliderClick: function(evt){
			var percent = Math.floor((evt.clientX / evt.currentTarget.offsetWidth) * 1000) / 1000;
			this.seekPercent(percent);
		},
		/**
		 * Update the slider's UI progress depending on video time
		 * @return {[type]} [description]
		 */
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
		/**
		 * Return the website's URL with the actual video time
		 * @return {[type]} [description]
		 */
		getShareLink: function(){
			return (window.location.href.replace(window.location.hash, "") +	"&time=" + Math.round(this.video.currentTime * 100) / 100);
		},
		/**
		 * Return a message for sharing the video on social media
		 * @return {[type]} [description]
		 */
		getShareMessage: function(){
			return "Check this 360° video on " + escape(this.getShareLink());
		},
		/**
		 * Display the Share Modal UI
		 * @return {[type]}     [description]
		 */
		showModalShare: function() {
			var that = this;
			function copyLink(){
				//Once the "copy link" button clicked, the copied link is displayed 500ms afterwards
				setTimeout(function(){
					//Set the desired URL to share in input and select it to put it in the clipboard
					document.querySelector("#shareLinkInput").style.display = "block";
					var shareLinkElt = document.querySelector("#shareLinkInput");
					shareLinkElt.value = that.getShareLink();
					shareLinkElt.select();

					try {
						//Put the selected text in the user's clipboard
						var status = document.execCommand('copy');
						if(!status){
							console.error("Cannot copy text");
						}else{
							console.log("The text is now on the clipboard");
						}
					} catch (err) {
						console.log('Unable to copy.');
					}
					document.querySelector("#copyLinkBtn").src = that.domainName + "Images/Share_Icons/Link-Form.svg";
				}, 500);

				document.querySelector("#copyLinkBtn").src = that.domainName + "Images/Share_Icons/Copy_Link_Button2.svg";
				document.querySelector("#copyLinkBtn").removeEventListener("click", copyLinkBtn);
			}

			document.getElementById("modalShare").style.display = "-webkit-flex";
			document.getElementById("modalShare").style.display = "-ms-flexbox";
			document.getElementById("modalShare").style.display = "-webkit-flex";
			document.getElementById("modalShare").style.display = "flex";
			document.querySelector("#copyLinkBtn").addEventListener("click", copyLink);
		},
		/**
		 * Reach out to facebook for video link sharing
		 * @return {[type]} [description]
		 */
		shareLinkFacebook: function() {
			window.open("https://www.facebook.com/sharer/sharer.php?u=" +  this.getShareLink(), "_blank");
		},
		/**
		 * Reach out to twitter for video link sharing
		 * @return {[type]} [description]
		 */
		shareLinkTwitter: function() {
			window.open("https://twitter.com/intent/tweet?text=" + this.getShareMessage() + "&via=lucidw3b", "_blank");
		},
		/**
		 * Reach out to googleplus for video link sharing
		 * @return {[type]} [description]
		 */
		shareLinkGoogleplus: function() {
			window.open("https://plus.google.com/share?url=" +  this.getShareLink(), "_blank");
		},
		/**
		 * Share the video link over email
		 * @return {[type]} [description]
		 */
		shareLinkEmail: function() {
			window.open("mailto:?subject=" +  this.getShareLink(), "_blank");
		},
		/**
		 * Hide the Share modal UI
		 * @return {[type]} [description]
		 */
		hideModalShare: function() {
			document.getElementById("modalShare").style.display = "none";
			document.querySelector("#copyLinkBtn").dataset.state = "copyLink";
			document.querySelector("#shareLinkInput").style.display = "none";
		},
		/**
		 * Check if the video's status is currently loading
		 * @return {[type]} [description]
		 */
		checkIsLoading: function(){
			if(this.video.ended || this.video.paused){
				return false;
			}

			var isLoading = (this.video.buffered.length && this.video.currentTime > this.video.buffered.end(this.video.buffered.length - 1));
			isLoading     = isLoading || this.video.readyState !== 4 || this.lastTime === this.video.currentTime;

			//Put a 30 frames delay before returning true to avoid intempestive loading UI
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
		/**
		 * Called on every frame
		 * Handle the UI's update and check video's state
		 * @return {[type]} [description]
		 */
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
