/* global AFRAME, THREE */
(function(){
	"use strict";

	/**
	* Function assimilating Enum properties for Javascript
	* @param       {[type]} values [description]
	* @constructor
	*/
	function Enum(values){
		for( var i = 0; i < values.length; ++i ){
			this[values[i]] = i;
		}
		return this;
	}
	/**
	* Return the string associated to an enum key
	* @param  {[type]} index [description]
	* @return {[type]}       [description]
	*/
	Enum.prototype.getKey = function(index){
		for(var key in this){
			if(this.hasOwnProperty(key)){
				if(this[key] === index){
					return key;
				}
			}
		}
	}

	/**
	* AFrame's Device Handler component. Help to present appropriate interface depending on the device
	* Here it is associated to transition screen to inform the user on what to do once the "Enter VR" button is pressed
	* @type {Object}
	*/
	AFRAME.registerComponent('lucidweb-device-handler', {
		schema:{
			displayTime: {type: "number", default: 3000}//Time during the transition screen should be shown
		},
		/**
		 * Called once at the initialisation of the component
		 * @return {[type]} [description]
		 */
		init: function() {
			var that = this;

			//Enum of the different types of devices
			this.deviceType = new Enum(['GEARVR', 'MOBILE', 'SAMSUNG_S8', 'SAMSUNG_S7', 'SAMSUNG_S6', 'GOOGLE_PIXEL', 'DESKTOP', 'VIVE', 'RIFT', 'WINDOWSMR', 'UNKNOWN']);
			//Enum of the different types of browser
			this.browserType = new Enum(['CHROME', 'SAMSUNG', 'EDGE', 'FIREFOX', 'UNKNOWN']);


			this.registerEvents();
			this.detectDevice();
		},
		/**
		 * Register events for VR state and orientation changes
		 * @return {[type]} [description]
		 */
		registerEvents: function(){
			var that = this;
			document.querySelector('a-scene').addEventListener('enter-vr', this.onEnterVR.bind(this));
			document.querySelector('a-scene').addEventListener('exit-vr', this.onExitVR.bind(this));

			this.onOrientationChangedCB = function(evt){ that.onOrientationChanged(evt);};
			this.onDisplayPresentChangedCB = function(evt){ that.onDisplayPresentChanged(evt);};
			this.hideEnterVRModalCB = function(evt){ that.hideEnterVRModal();};
		},
		/**
		 * Called when entering VR state
		 * @return {[type]} [description]
		 */
		onEnterVR: function() {
			this.showEnterVRModal();
		},
		/**
		 * Called on exiting VR state
		 * @return {[type]} [description]
		 */
		onExitVR: function() {
			this.hideEnterVRModal(true);
		},
		/**
		* Called on EnterVR event, this method displays the appropriate Transition Screen Modal
		* for the user to know what to do next
		* @return {[type]} [description]
		*/
		showEnterVRModal: function(){
			var modalEnterVR = document.querySelector("#modalEnterVR");
			var aScene = document.querySelector("a-scene");

			//Check the device type to display the associated transition screen
			switch(this.displayDevice.type){
				case this.deviceType.SAMSUNG_S6:
				case this.deviceType.SAMSUNG_S7:
				modalEnterVR.style.backgroundImage = "url("+player.domainName+"Images/Transition_Screens/gearvr_portrait.png)";
				modalEnterVR.classList.add("show");
				aScene.classList.add("hide");
				window.addEventListener("orientationchange", this.onOrientationChangedCB);
				break;
				case this.deviceType.GOOGLE_PIXEL:
				modalEnterVR.style.backgroundImage = "url("+player.domainName+"Images/Transition_Screens/google_pixel_portrait.png)";
				modalEnterVR.classList.add("show");
				aScene.classList.add("hide");
				window.addEventListener("orientationchange", this.onOrientationChangedCB);
				break;
				case this.deviceType.SAMSUNG_S8:
				if(this.displayDevice.browser === this.browserType.SAMSUNG){
					modalEnterVR.style.backgroundImage = "url("+player.domainName+"Images/Transition_Screens/gearvr_portrait.png)";
				}
				else{
					modalEnterVR.style.backgroundImage = "url("+player.domainName+"Images/Transition_Screens/samsung_s8_usingchrome_portrait.png)";
				}
				modalEnterVR.classList.add("show");
				aScene.classList.add("hide");
				window.addEventListener("orientationchange", this.onOrientationChangedCB);
				break;
				case this.deviceType.MOBILE:
				modalEnterVR.style.backgroundImage = "url("+player.domainName+"Images/Transition_Screens/cardboard_portrait.png)";
				modalEnterVR.classList.add("show");
				aScene.classList.add("hide");
				window.addEventListener("resize", this.onOrientationChangedCB);
				window.addEventListener("orientationchange", this.onOrientationChangedCB);
				break;
				case this.deviceType.RIFT:
				modalEnterVR.style.backgroundImage = "url("+player.domainName+"Images/Transition_Screens/oculus_landscape.png)";
				modalEnterVR.classList.add("show");
				window.addEventListener('vrdisplaypresentchange', this.onDisplayPresentChangedCB);
				break;
				case this.deviceType.VIVE:
				modalEnterVR.style.backgroundImage = "url("+player.domainName+"Images/Transition_Screens/vive_landscape.png)";
				modalEnterVR.classList.add("show");
				window.addEventListener('vrdisplaypresentchange', this.onDisplayPresentChangedCB);
				break;
				default:
				//Will need to handle every new platform as they come up
				break;
			}
		},
		/**
		* Called to hide the Transition Screen Modal
		* @param  {[type]} removeListeners [description]
		* @return {[type]}                 [description]
		*/
		hideEnterVRModal: function(removeListeners){
			document.querySelector("#modalEnterVR").classList.remove("show");
			document.querySelector("a-scene").classList.remove("hide");
			if(removeListeners){
				window.removeEventListener("resize", this.onOrientationChangedCB);
				window.removeEventListener("orientationchange", this.onOrientationChangedCB);
				window.removeEventListener('vrdisplaypresentchange', this.onDisplayPresentChangedCB);
			}
			window.removeEventListener('click', this.hideEnterVRModalCB);
			window.removeEventListener('touch', this.hideEnterVRModalCB);
		},
		/**
		* Called when the user (or the software) rotate the smartphone's orientation
		* (supposedly to insert it into an HMD)
		* @return {[type]} [description]
		*/
		onOrientationChanged: function(){
			var that = this;
			//Retrieve the device's orientation, working with every browser
			var angle = (screen.orientation && screen.orientation.angle ? screen.orientation.angle : window.orientation);

			function clearModalTimeout(){
				if(that.hideModalTimeout){
					clearTimeout(that.hideModalTimeout);
					that.hideModalTimeout = undefined;
				}
			}

			var modalEnterVR = document.querySelector("#modalEnterVR");
			var aScene = document.querySelector("a-scene");
			if(angle === 90 || angle === 270){
				//Orientation has been changed for landscape
				modalEnterVR.style.backgroundImage = modalEnterVR.style.backgroundImage.replace("_portrait", "_landscape");
				clearModalTimeout();

				this.hideModalTimeout = setTimeout(function(){
					modalEnterVR.classList.remove("show");
					aScene.classList.remove("hide");
				}, this.data.displayTime);

				window.addEventListener('click', this.hideEnterVRModalCB);
				window.addEventListener('touch', this.hideEnterVRModalCB);
			}
			else{
				//Orientation is portrait
				if(player.video.duration && player.video.currentTime >= (player.video.duration * 0.99) && AFRAME.scenes[0].states[0] === "vr-mode"){
					//If user goes back to portrait towards the end of the video, we assume he wants to exit VR mode
					AFRAME.scenes[0].exitVR();
					modalEnterVR.classList.remove("show");
					aScene.classList.remove("hide");
					clearModalTimeout();
				}
				else{
					modalEnterVR.style.backgroundImage = modalEnterVR.style.backgroundImage.replace("_landscape", "_portrait");
					modalEnterVR.classList.add("show");
					aScene.classList.add("hide");
					clearModalTimeout();
				}
			}
		},
		/**
		* Called when the displaypresent event is called (e.g. when the experience is shown through the headset)
		* (works with WebVR 1.1)
		* @param  {[type]} evt [description]
		* @return {[type]}     [description]
		*/
		onDisplayPresentChanged: function(evt){
			setTimeout(function(){
				document.querySelector("#modalEnterVR").classList.remove("show");
				document.querySelector("a-scene").classList.remove("hide");
			}, this.data.displayTime);
		},
		/**
		* Function to determine which device is currently used
		* @return {[type]} [description]
		*/
		detectDevice: function() {
			var that = this;
			this.displayDevice = undefined;

			function getDevice(){
				return new Promise(function(resolve, reject){
					try{
						navigator.getVRDisplays().then(function (displays) {
							that.displayDevice = displays[0] || {};
							var AFDevice = AFRAME.utils.device;

							if(AFDevice.isGearVR()){
								that.displayDevice.type = that.deviceType.GEARVR;
							}
							else if(AFDevice.isMobile()){
								if(/SM-G95/.test(navigator.userAgent)){
									that.displayDevice.type = that.deviceType.SAMSUNG_S8;
								}
								else if(/SM-G93/.test(navigator.userAgent)){
									that.displayDevice.type = that.deviceType.SAMSUNG_S7;
								}
								else if(/SM-G92/.test(navigator.userAgent)){
									that.displayDevice.type = that.deviceType.SAMSUNG_S6;
								}
								else if(/Pixel/.test(navigator.userAgent)){
									that.displayDevice.type = that.deviceType.GOOGLE_PIXEL;
								}
								else{
									that.displayDevice.type = that.deviceType.MOBILE;
								}

								if(/EdgA/.test(navigator.userAgent)){
									that.displayDevice.browser = that.browserType.EDGE;
								}
								else if(/SamsungBrowser/.test(navigator.userAgent)){
									that.displayDevice.browser = that.browserType.SAMSUNG;
								}
								else if(/Firefox/.test(navigator.userAgent)){
									that.displayDevice.browser = that.browserType.FIREFOX;
								}
								else if(/Chrome/.test(navigator.userAgent)){
									that.displayDevice.browser = that.browserType.CHROME;
								}
								else{
									that.displayDevice.browser = that.browserType.UNKNOWN;
								}
							}
							else if (displays.length > 0){ //trys to match high end headsets
								switch (displays[0].displayName) {
									case 'Oculus VR HMD':
									that.displayDevice.type = that.deviceType.RIFT;
									break;
									case 'OpenVR HMD':
									that.displayDevice.type = that.deviceType.VIVE;
									break;
									case 'HTC Vive MV':
									that.displayDevice.type = that.deviceType.VIVE;
									break;
									case 'Acer AH100':
									that.displayDevice.type = that.deviceType.WINDOWSMR;
									break;
									default: //undetected
									console.log('undetected device name: ' + displays[0].displayName);
									break;
								}
							}
							else if(displays.length === 0){
								//No VR display found, meaning we're on desktop with a non-VR browser or no HMD wired
								that.displayDevice = {displayName: "desktop"};
								that.displayDevice.type = that.deviceType.DESKTOP;
							}
							else {
								that.displayDevice.type = that.deviceType.UNKNOWN;
							}
							resolve(that.displayDevice);
						});
					}
					catch(err){
						reject(err);
					}
				});
			}

			getDevice().then(function(device){
				document.getElementById("device").innerHTML = "device: " + that.deviceType.getKey(device.type) + " browser: " + that.browserType.getKey(device.browser);
				if (device.type != that.deviceType.UNKNOWN) {
					document.getElementById("device").style.color = "yellow";
				}
				return true;
			});
		}
	});
})()
