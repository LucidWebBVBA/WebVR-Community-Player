# LucidWeb WebVR-Core-Player

WebVR 360 video player.

----

### Embed the Lucidweb Player

In order to embed the LucidWeb player, you need to had the library to your header  
Then you need to add a div to your body, with the id *lucidweb-player* and the *src* attribute indicating the path to your 360° movie:

    <script type="text/javascript" src="https://lucidweb.io/communityplayer/Lib/lucidweb-player-embed.js"></script>
    <div id="lucidweb-player" src="https://lucidweb.io/embbed/testing_videos/Silence_2k.mp4"></div>

    <button id="lucidweb-player-start">Click here to start the experience</button><!--not mandatory-->

The library will automatically load the files necessary to play your video.  

**TIPS:** if the player's buttons show up but the video doesn't load, make sure you're presenting the video on the same domain as where it is hosted. Otherwise, you might have a [CORS policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) problem.

## Player: lucidweb-player component
This A-Frame component needs to be added to a *<a-videosphere>* component. The **lucidweb-player** component will fetch URL parameters to play a video, or play the one associated to the **a-videosphere** component.  
To load a video through the URL, use the following parameters:

* src: URL to the video you want to play
* time: seek time (in seconds) to start the video at

> Example:  
> https://lucidweb.io/player?src=urlToMyVideo&time=42  

### Component usage:  
    <a-scene >
      <a-assets>
        <video id="video" webkit-playsinline src="skybox.mp4">
      </a-assets>

      <a-videosphere lucidweb-player src="#video"></a-videosphere>
    </a-scene>
### Folder architecture

> ./Components //A-Frame components folder  
> ./Embed //example file and HTML parts  
> ./Images //folder for image assets  
> ./Lib //hosting the embed library
