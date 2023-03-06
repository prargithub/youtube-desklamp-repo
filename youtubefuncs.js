var events = [];
var errors = [];
var vid = "";
var loopVideos = false;
var shuffleCount = 0;
var activePlayer = "myythtml5player";
var contentType = "load-video";
var playerContent = "fJ9rUzIMcZQ";
var player;
var iframeCount = 1;
var playerParams = "";
var listRegex = new RegExp("&list=([^&]+)");
var listTypeRegex = new RegExp("&listType=([^&]+)");
var playlistRegex = new RegExp("&playlist=([^&]+)");

/**
 * The loadPlayerContent function chooses the appropriate content to
 * put in an updated Flash player if the user has set values for the
 * list and listType player parameters or just for the playlist player
 * parameter. Otherwise, the Flash player loads whichever content is
 * specified on the "Player controls" form.
 * @param {string} playerParams Mandatory List of player parameters set by user.
 * @param {Object} fallbackPlayer Mandatory Object that identifies the element
 *     containing the player. Used if we are resetting the object's data
 *     property rather than calling a function like loadPlaylist().
 * @param {string} fallbackPlayerUrl Mandatory URL to use if resetting the
 *     the data property for current player.
 */
function loadPlayerContent(playerParams, fallbackPlayer, fallbackPlayerUrl) {
  // Call a function to load the requested content (video, playlist, etc.)
  var startIndex = "0";
  var startTime = document.getElementById("startseconds").value;
  if (playerParams.match(/listType=/) && playerParams.match(/list=/)) {
    var list = "";
    var listType = "";
    var getList = listRegex.exec(playerParams);
    if (getList && getList.length > 1 && getList[1]) {
      list = getList[1];
    }
    var getListType = listTypeRegex.exec(playerParams);
    if (getListType && getListType.length > 1 && getListType[1]) {
      listType = getListType[1];
    }
    if (listType == "playlist" || listType == "user_uploads") {
      player.loadPlaylist({
        listType: listType,
        list: list,
        index: startIndex,
        startSeconds: startTime,
      });
    } else {
      fallbackPlayer.data = fallbackPlayerUrl;
    }
  } else if (playerParams.match(/playlist=/)) {
    var getPlaylist = playlistRegex.exec(playerParams);
    if (getPlaylist && getPlaylist.length > 1 && getPlaylist[1]) {
      var videoIds = getPlaylist[1].split(",");
      player.loadPlaylist(videoIds, startIndex, startTime);
    } else {
      fallbackPlayer.data = fallbackPlayerUrl;
    }
  }
}

/**
 * The 'redrawPlayer' function builds the Iframe URL based on the selected video
 * and other parameters that the user may have selected. It also redraws the
 * player on the page.
 * @return {string} The Iframe URL for the video player.
 */
function redrawPlayer() {
  // Redraw player when changing player params
  // Otherwise, we can call a function like cueVideoById.
  // Note: if the player params have changed and they're changing back to the
  // same parameters already used in the IFrame player, and the player version
  // is also switching to the iframe player, then there's no need to redraw.
  var updatePlayer = false;
  var currentPlayerParams = getEmbeddedPlayerOptions();
  if (currentPlayerParams != playerParams) {
    updatePlayer = true;
  }

  playerParams = currentPlayerParams;
  contentType = document.getElementById("contentType").value;
  playerContent = document.getElementById("playerContent").value;
  if (!sanitizePlayerContentInput(contentType, playerContent)) {
    // TODO: Set error message that will be more visible?
    return false;
  }

  // Update the 'vid' variable to reflect specified content.
  setVideoId();

  // If the user has selected a video list, build an array of videos, which
  // would be used to call a function, and build a parameter value, which
  // would be used to load a new player with the specified content.
  var videoList = "";
  var videos = [];
  if (contentType == "load-videolist" || contentType == "cue-videolist") {
    var videoListArray = playerContent.split(",");
    for (listItem = 0; listItem < videoListArray.length; listItem++) {
      videos.push(videoListArray[listItem]);
      if (listItem > 0) {
        videoList += videoListArray[listItem] + ",";
      }
    }
  }

  if (!updatePlayer) {
    // Call a function to load the requested content (video, playlist, etc.)
    var startIndex = "0";
    var startTime = document.getElementById("startseconds").value;
    if (contentType == "load-video") {
      loadVideo(vid, startTime);
    } else if (contentType == "cue-video") {
      cueVideo(vid, startTime);
    } else if (contentType == "load-videolist") {
      loadListArray(videos, startIndex, startTime);
    } else if (contentType == "cue-videolist") {
      cueListArray(videos, startIndex, startTime);
    } else if (
      contentType == "load-playlist" ||
      contentType == "load-user_uploads"
    ) {
      loadList(contentType, playerContent, startIndex, startTime);
    } else if (
      contentType == "cue-playlist" ||
      contentType == "cue-user_uploads"
    ) {
      cueList(contentType, playerContent, startIndex, startTime);
    }
  } else {
    // Stop the player and clear logs if the user is creating a new player.
    stop();
    clearOutput();
    var playerVideo = vid;
    // Get the player base URL, which includes the API version and the
    // selected video content.
    var playerVars = {
      enablejsapi: "1",
      origin: "https://developers.google.com",
      version: "3",
    };

    // Set the user's player options to reflect actual selections
    // since we need to change playerapiid to the id of the player
    // embedded on this page and also always want to enable the JS
    // API for the player on this page.
    var playerUrlParams = currentPlayerParams.split("&");
    for (param = 0; param < playerUrlParams.length; param++) {
      if (playerUrlParams[param]) {
        var keyValueArray = playerUrlParams[param].split("=");
        var playerKey = keyValueArray[0];
        var playerValue = "";
        if (keyValueArray.length > 1) {
          playerValue = keyValueArray[1];
        }
        playerVars[playerKey] = playerValue;
      }
    }

    // If the user is loading a video list, the first video in the list
    // is in the URL path, and the remaining videos are in the playlist param.
    if (contentType == "load-videolist" || contentType == "cue-videolist") {
      playerVars["playlist"] = videoList.substr(0, videoList.length - 1);
    } else if (contentType != "load-video" || contentType == "cue-video") {
      var listType = contentType.replace("load-", "");
      listType = listType.replace("cue-", "");
      playerVars["listType"] = listType;
      playerVars["list"] = playerContent;
    }

    // Replace existing player with new one reflecting specified options.
    newHtml5DivId = "myythtml5player" + iframeCount;
    iframeCount++;
    playerVars["playerapiid"] = newHtml5DivId;

    // Remove old player and create a new one.
    html5Node = document.getElementById("html5player-wrapper");
    if (html5Node) {
      while (html5Node.hasChildNodes()) {
        html5Node.removeChild(html5Node.firstChild);
      }
    }
    newHtml5Div = document.createElement("div");

    newHtml5Div.id = newHtml5DivId;
    html5Node.appendChild(newHtml5Div);
    createYTPlayer(newHtml5DivId, "405", "720", playerVideo, playerVars);
    getEmbedCode();
  }

  // Show/hide playlist functions when selected content type is 'video'
  playlistOnlyElements = ["playlist-position-options", "playlist-statistics"];
  for (count = 0; count < playlistOnlyElements.length; count++) {
    var element = document.getElementById(playlistOnlyElements[count]);
    element.style.display =
      contentType == "load-video" || contentType == "cue-video"
        ? "none"
        : "block";
  }
}

/**
 * The 'getEmbeddedPlayerOptions' function retrieves the player parameters
 * that the user has selected and builds a parameter string.
 * @return {string} The selected options.
 */
function getEmbeddedPlayerOptions() {
  var parent = document.getElementById("embedded-player-options");
  var inputs = parent.getElementsByTagName("input");
  var selects = parent.getElementsByTagName("select");

  // First character in arguments should be '?' unless URL already
  // contains parameters, in which case, it should be '&'.
  var argString = "&";

  // Construct arg string based on values of player params in form.
  // Do not include parameter in string if it's set to default value.
  for (var i = 0, input; (input = inputs[i]); i++) {
    var value = input.value;
    var name = input.id.replace(/embedded\-player\-/, "");
    // XSS sanitizer -- make sure player height/width are numbers.
    if (
      name == "fs" ||
      name == "rel" ||
      name == "showinfo" ||
      name == "controls"
    ) {
      if (input.checked) {
        continue;
      }
      value = "0";
    } else if (value == "on" && input.checked) {
      value = "1";
      // XSS sanitizer -- make sure all parameters all contain valid values.
    } else if (
      name == "playlist" &&
      (!value || !xssSanitizer("playlist", value, "playlist"))
    ) {
      continue;
    } else if (name == "hl" && (!value || !xssSanitizer("hl", value, "hl"))) {
      continue;
    } else if (name == "list") {
      var listTypeEl = document.getElementById("embedded-player-listType");
      if (value && value != "" && listTypeEl && listTypeEl.value) {
        var selectedListType = listTypeEl.value;
        if (
          selectedListType == "user_uploads" &&
          xssSanitizer("list", value, "username")
        ) {
          argString += name + "=" + value + "&listType=user_uploads&";
        } else if (
          selectedListType == "playlist" &&
          xssSanitizer("list", value, "playlistId")
        ) {
          argString += name + "=" + value + "&listType=playlist&";
        }
      }
      continue;
    } else if (
      name == "end" &&
      (!value || !xssSanitizer("end", value, "digits"))
    ) {
      continue;
    } else if (
      name == "start" &&
      (!value || !xssSanitizer("start", value, "digits"))
    ) {
      continue;
    } else if (
      name == "end" ||
      name == "start" ||
      name == "playlist" ||
      name == "hl"
    ) {
      argString += name + "=" + value + "&";
      continue;
    } else {
      continue;
    }
    argString += name + "=" + value + "&";
  }
  for (var s = 0, select; (select = selects[s]); s++) {
    var value = select.value;
    var name = select.id.replace(/embedded\-player\-/, "");
    if (
      (name == "iv_load_policy" && value != "1") ||
      (name == "color" && value != "red")
    ) {
      argString += name + "=" + value + "&";
    }
  }
  argString = argString.substring(0, argString.length - 1);
  return argString;
}

/**
 * The 'setVideoId' function identifies the type of content that the user has
 * selected for the player to play and sets the 'vid' variable, which is used
 * in the embedded player URL to identify a video ID for the desired content.
 */
function setVideoId() {
  if (contentType == "load-video" || contentType == "cue-video") {
    vid = playerContent == "" ? "fJ9rUzIMcZQ" : playerContent;
  } else if (
    contentType == "load-videolist" ||
    contentType == "cue-videolist"
  ) {
    var videoListArray = playerContent.split(",");
    vid = videoListArray[0];
  } else {
    vid = "videoseries";
  }
}

/**
 * The 'toggleControls' function shows or hides the player controls and
 * player parameters.
 */
function toggleControls() {
  if (
    document.getElementById("player-demo-functions").style.display == "none"
  ) {
    document.getElementById("player-demo-parameters").style.display = "none";
    document.getElementById("player-demo-embed-code").style.display = "none";
    document.getElementById("toggle-controls-wrapper").style.display = "none";
    document.getElementById("toggle-parameters-wrapper").style.display =
      "block";
    document.getElementById("player-demo-functions").style.display = "block";
    document.getElementById("player-demo-statistics").style.display = "block";
  } else {
    document.getElementById("player-demo-functions").style.display = "none";
    document.getElementById("player-demo-statistics").style.display = "none";
    document.getElementById("toggle-parameters-wrapper").style.display = "none";
    document.getElementById("toggle-controls-wrapper").style.display = "block";
    document.getElementById("player-demo-parameters").style.display = "block";
    document.getElementById("player-demo-embed-code").style.display = "block";
  }
}

/**
 * The 'updateHTML' function updates the innerHTML of an element.
 * @param {string} elmId Mandatory The element to update HTML for.
 * @param {string} value Mandatory The updated HTML for the element.
 */
function updateHTML(elmId, value) {
  if (document.getElementById(elmId)) {
    document.getElementById(elmId).innerHTML = value;
  }
}

/**
 * The 'addInformation' function pushes data onto the events array, then calls
 * getVideoUrl() and getEmbedCode(), a sequence is common to several functions.
 * @param {string} opt_eventData Optional The event to log.
 */
function addInformation(opt_eventData) {
  if (opt_eventData) {
    events.push(opt_eventData);
  }
  getVideoUrl();
  getEmbedCode();
}

/**
 * The 'clearOutput' removes any HTML in a few page elements and resets
 * the events[] and errors[] arrays.
 */
function clearOutput() {
  updateHTML("errorCode", "None yet.");
  updateHTML("videoUrl", "");
  updateHTML("eventhistory", "None yet.");
  events = [];
  errors = [];
}

/**
 * The 'createYTPlayer' function embeds an <iframe> player.
 * @param {string} playerDiv Mandatory The DOM ID for the div where the
 *     <iframe> will be embedded.
 * @param {string} playerHeight Mandatory The height of the embedded player.
 * @param {string} playerWidth Mandatory The width of the embedded player.
 * @param {string} playerVideoId Mandatory The video ID to embed.
 * @param {Object} playerVars Mandatory Player parameters or {}.
 */
function createYTPlayer(
  playerDiv,
  playerHeight,
  playerWidth,
  playerVideoId,
  playerVars
) {
  if ("list" in playerVars && "listType" in playerVars) {
    var newPlayer = new YT.Player(playerDiv, {
      height: playerHeight,
      width: playerWidth,
      playerVars: playerVars,
      events: {
        onError: onPlayerError,
        onPlaybackQualityChange: onytplayerQualityChange,
        onPlaybackRateChange: onytplayerPlaybackRateChange,
        onReady: onYouTubeHTML5PlayerReady,
        onStateChange: onytplayerStateChange,
      },
    });
  } else {
    var newPlayer = new YT.Player(playerDiv, {
      height: playerHeight,
      width: playerWidth,
      videoId: playerVideoId,
      playerVars: playerVars,
      events: {
        onError: onPlayerError,
        onPlaybackQualityChange: onytplayerQualityChange,
        onPlaybackRateChange: onytplayerPlaybackRateChange,
        onReady: onYouTubeHTML5PlayerReady,
        onStateChange: onytplayerStateChange,
      },
    });
  }
}

/**
  EVENT HANDLERS
 */

/**
 * The 'onYouTubePlayerReady' function executes when the onReady event
 * fires, indicating that the player is loaded, initialized and ready
 * to receive API calls.
 * @param {Object} event Mandatory A value that identifies the player.
 */
function onYouTubeHTML5PlayerReady(event) {
  // No need to do any of this stuff if the function was called because
  // the user customized the player parameters for the embedded player.
  if (event && event.target) {
    player = event.target;

    setInterval(updateytplayerInfo, 600);
    addInformation();
    updateytplayerInfo();
  }
}

function onYouTubePlayerAPIReady() {
  createYTPlayer("myythtml5player", "405", "720", "fJ9rUzIMcZQ", {});
}

/**
 * The 'onytplayerStateChange' function executes when the onStateChange
 * event fires. It captures the new player state and updates the
 * "Player state" displayed in the "Playback statistics".
 * @param {string|Object} newState Mandatory The new player state.
 */
function onytplayerStateChange(newState) {
  if (typeof newState == "object" && newState["data"]) {
    newState = newState["data"];
  }
  events.push(
    'onStateChange event: Player state changed to: "' +
      newState +
      '" (' +
      getPlayerState(newState) +
      ")"
  );
  updateHTML("playerstate", newState);
}

/**
 * The 'onPlayerError' function executes when the onError event fires.
 * It captures the error and adds it to an array that is displayed in
 * the "Errors" section of the demo.
 * @param {string} errorCode Mandatory A code that explains the error.
 */
function onPlayerError(errorCode) {
  if (typeof errorCode == "object" && errorCode["data"]) {
    errorCode = errorCode["data"];
  }
  errors.push("Error: " + errorCode);
}

/**
 * The 'onytplayerQualityChange' function executes when the
 * onPlaybackQualityChange event fires. It captures the new playback quality
 * and updates the "Quality level" displayed in the "Playback Statistics".
 * @param {string|Object} newQuality Mandatory The new playback quality.
 */
function onytplayerQualityChange(newQuality) {
  if (typeof newQuality == "object" && newQuality["data"]) {
    newQuality = newQuality["data"];
  }
  events.push(
    "onPlaybackQualityChange event: " +
      'Playback quality changed to "' +
      newQuality +
      '"'
  );
}

/**
 * The 'onytplayerPlaybackRateChange' function executes when the
 * onPlaybackRateChange event fires. It captures the new playback rate
 * and updates the "Plabyack rate" displayed in the "Playback Statistics".
 * @param {string|Object} newRate Mandatory The new playback rate.
 */
function onytplayerPlaybackRateChange(newRate) {
  if (typeof newRate == "object" && newRate["data"]) {
    newRate = newRate["data"];
  }
  events.push(
    "onPlaybackRateChange event: " +
      'Playback rate changed to "' +
      newRate +
      '"'
  );
}

/**
 * PLAYER FUNCTION CALLS
 * Player function calls are documented at:
 * https://developers.google.com/youtube/iframe_api_reference.html
 *
 * You can navigate directly to a description of each function by
 * appending the function name, as an anchor link, to the URL above.
 * For example, the two URLs below would be used to link to the "mute"
 * and "playVideo" functions, respectively:
 * https://developers.google.com/youtube/iframe_api_reference.html#mute
 * https://developers.google.com/youtube/iframe_api_reference.html#playVideo
 */

/**
 * The 'cueVideo' function determines whether the user is trying to
 * cue a video by its video ID or its URL and then calls the appropriate
 * function to actually cue the video. After cueing the video, this
 * function updates the video URL and embed code for the video.
 * @param {string} idOrUrl Mandatory The ID or URL for the video to cue.
 * @param {number} startSeconds Optional The time offset, measured in
 *     seconds from the beginning of the video, from which the video
 *     should start playing.
 */
function cueVideo(idOrUrl, startSeconds) {
  // XSS sanitizer -- make sure params contain valid values
  if (
    xssSanitizer("Video ID or URL", idOrUrl, "videoIdOrUrl") &&
    xssSanitizer("Start at", startSeconds, "digits")
  ) {
    var urlRegex = /https\:/;
    if (idOrUrl.match(urlRegex)) {
      player.cueVideoByUrl(idOrUrl, parseInt(startSeconds));
      addInformation(
        "cueVideoByUrl(" + idOrUrl + ", parseInt(" + startSeconds + ");"
      );
    } else {
      player.cueVideoById(idOrUrl, parseInt(startSeconds));
      addInformation(
        "cueVideoById(" + idOrUrl + ", parseInt(" + startSeconds + ");"
      );
    }
  }
}

/**
 * The 'loadVideo' function determines whether the user is trying to
 * load a video by its video ID or its URL and then calls the appropriate
 * function to actually load the video. After loading the video, this
 * function updates the video URL and embed code for the video.
 * @param {string} idOrUrl Mandatory The ID or URL for the video to load.
 * @param {number} startSeconds Optional The time offset, measured in
 *     seconds from the beginning of the video, from which the video
 *     should start playing.
 */
function loadVideo(idOrUrl, startSeconds) {
  // XSS sanitizer -- make sure params contain valid values
  if (
    xssSanitizer("Video ID or URL", idOrUrl, "videoIdOrUrl") &&
    xssSanitizer("Start at", startSeconds, "digits")
  ) {
    var urlRegex = /https\:/;
    if (idOrUrl.match(urlRegex)) {
      player.loadVideoByUrl(idOrUrl, parseInt(startSeconds));
      addInformation(
        "loadVideoByUrl(" + idOrUrl + ", parseInt(" + startSeconds + ");"
      );
    } else {
      player.loadVideoById({
        videoId: idOrUrl,
        startSeconds: parseInt(startSeconds),
      });
      addInformation(
        "loadVideoById(" + idOrUrl + ", parseInt(" + startSeconds + ");"
      );
    }
  }
}

/**
 * The 'cueListArray' function determines whether the user is trying to
 * cue a video by its video ID or its URL and then calls the appropriate
 * function to actually cue the video. After cueing the video, this
 * function updates the video URL and embed code for the video.
 * @param {string} videoList Mandatory List of video IDs to load/cue.
 * @param {string} startIndex Mandatory First video in set to play.
 * @param {number} startSeconds Optional The time offset, measured in
 *     seconds from the beginning of the video, from which the video
 *     should start playing.
 */
function cueListArray(videoList, startIndex, startSeconds) {
  // XSS sanitizer -- make sure params contain valid values
  if (
    xssSanitizer("Start index", startIndex, "digits") &&
    xssSanitizer("Start at", startSeconds, "digits")
  ) {
    player.cuePlaylist(videoList, parseInt(startIndex), parseInt(startSeconds));
    addInformation(
      "cuePlaylist(['" +
        videoList.join("','") +
        "'], " +
        startIndex +
        ", parseInt(" +
        startSeconds +
        ");"
    );
  }
}

/**
 * The 'loadListArray' function loads a list of videos specified by
 * their video ID, calling the loadPlaylist function and using that
 * function's argument syntax.
 * @param {string} videoList Mandatory Array of video IDs.
 * @param {number} startIndex Optional First video to play in array.
 * @param {number} startSeconds Optional See loadVideo function.
 */
function loadListArray(videoList, startIndex, startSeconds) {
  // XSS sanitizer -- make sure params contain valid values
  if (
    xssSanitizer("Start index", startIndex, "digits") &&
    xssSanitizer("Start at", startSeconds, "digits")
  ) {
    player.loadPlaylist(
      videoList,
      parseInt(startIndex),
      parseInt(startSeconds)
    );
    addInformation(
      "loadPlaylist(['" +
        videoList.join("','") +
        "'], " +
        startIndex +
        ", parseInt(" +
        startSeconds +
        ");"
    );
  }
}

/**
 * The 'cueList' function loads a list of videos, which could be a
 * playlist or a list of user uploads. It calls the cuePlaylist function and
 * uses that function's object syntax.
 * @param {string} listType Mandatory Type of list to cue.
 * @param {string} list Mandatory Combines with listType to identify list.
 * @param {number} startIndex Optional First video to play in array.
 * @param {number} startSeconds Optional See loadVideo function.
 */
function cueList(listType, list, startIndex, startSeconds) {
  // XSS sanitizer -- make sure params contain valid values
  if (
    xssSanitizer("Start index", startIndex, "digits") &&
    xssSanitizer("Start at", startSeconds, "digits")
  ) {
    listType = listType.replace("cue-", "");
    player.cuePlaylist({
      listType: listType,
      list: list,
      index: startIndex,
      startSeconds: parseInt(startSeconds),
    });
    addInformation(
      "cuePlaylist({'listType': '" +
        listType +
        "', '" +
        "'list': '" +
        list +
        "','index': '" +
        startIndex +
        "'," +
        "'startSeconds': '" +
        startSeconds +
        "'});"
    );
  }
}

/**
 * The 'loadList' function loads a list of videos, which could be a
 * playlist or a list of user uploads. It calls the loadPlaylist function and
 * uses that function's object syntax.
 * @param {string} listType Mandatory Type of list to load.
 * @param {string} list Mandatory Combines with listType to identify list.
 * @param {number} startIndex Optional First video to play in array.
 * @param {number} startSeconds Optional See loadVideo function.
 */
function loadList(listType, list, startIndex, startSeconds) {
  // XSS sanitizer -- make sure params contain valid values
  if (
    xssSanitizer("Start index", startIndex, "digits") &&
    xssSanitizer("Start at", startSeconds, "digits")
  ) {
    listType = listType.replace("load-", "");
    player.loadPlaylist({
      listType: listType,
      list: list,
      index: startIndex,
      startSeconds: parseInt(startSeconds),
    });
    addInformation(
      "loadPlaylist({'listType': '" +
        listType +
        "', '" +
        "'list': '" +
        list +
        "','index': '" +
        startIndex +
        "'," +
        "'startSeconds': '" +
        startSeconds +
        "'});"
    );
  }
}

// Playback controls and player settings
/**
 * The 'play' function plays the currently cued/loaded video. It calls
 * player.playVideo().
 */
function play() {
  events.push("playVideo();");
  player.playVideo();
}

/**
 * The 'pause' function pauses the currently cued/loaded video. It calls
 * player.pauseVideo().
 */
function pause() {
  events.push("pauseVideo();");
  player.pauseVideo();
}

/**
 * The 'stop' function stops the currently cued/loaded video. It also
 * closes the NetStream object and cancels loading of the video. It calls
 * player.stopVideo().
 */
function stop() {
  events.push("stopVideo();");
  player.stopVideo();
}

/**
 * The 'seekTo' function seeks to the specified time of the video. The
 * time is specified as an offest, measured in seconds from the beginning
 * of the video. The function causes the player to find the closest
 * keyframe before the specified value.
 * @param {number} seconds Mandatory The time offset to skip to.
 * @param {boolean} allowSeekAhead Mandatory A flag that indicates if
 *     the player will make a new request to the server if the
 *     specified time is beyond the currently loaded video data.
 */
function seekTo(seconds, allowSeekAhead) {
  // XSS sanitizer -- make sure param contains a valid value
  if (xssSanitizer("Seek to", seconds, "digits")) {
    events.push("seekTo(" + seconds + ", " + allowSeekAhead + ");");
    player.seekTo(seconds, allowSeekAhead);
    document.getElementById("embedded-player-start").value = seconds;
  }
}

// Playing a video in a playlist

/**
 * The 'nextVideo' function plays the next video in a playlist.
 * It calls player.nextVideo().
 */
function nextVideo() {
  events.push("nextVideo();");
  player.nextVideo();
}

/**
 * The 'previousVideo' function plays the previous video in a playlist.
 * It calls player.previousVideo().
 */
function previousVideo() {
  events.push("previousVideo();");
  player.previousVideo();
}

/**
 * The 'playVideoAt' function seeks to a video at the specified playlist index.
 * @param {number} index Mandatory The playlist index of the video.
 */
function playVideoAt(index) {
  // XSS sanitizer -- make sure param contains a valid value
  if (xssSanitizer("Playlist index number", index, "digits")) {
    events.push("playVideoAt(" + index + ");");
    player.playVideoAt(index);
  }
}

// Setting playback behavior for playlists
/**
 * The 'setLoop' function indicates whether videos should play in a loop.
 */
function setLoop() {
  loopVideos = loopVideos ? false : true;
  events.push("setLoop(" + loopVideos + ");");
  // Update UI to reflect correct looping status.
  document.getElementById("player-loop-status").innerHTML = loopVideos
    ? "on"
    : "off";
  document.getElementById("player-loop-link").innerHTML = loopVideos
    ? "off"
    : "on";
  document.getElementById("embedded-player-loop").checked = loopVideos
    ? true
    : false;
  player.setLoop(loopVideos);
}

/**
 * The 'setShuffle' function indicates whether videos should be shuffled.
 * If videos are already shuffled and parameter is true, videos will be
 * reshuffled. If parameter is false, videos return to original order.
 * @param {boolean} shuffleVideos Mandatory Set to true to shuffle videos.
 */
function setShuffle(shuffleVideos) {
  if (shuffleVideos) {
    shuffleCount += 1;
    document.getElementById("player-shuffle-text").style.display = "";
    document.getElementById("player-unshuffle-link").style.display = "";
  } else {
    shuffleCount = 0;
    document.getElementById("player-shuffle-text").style.display = "none";
    document.getElementById("player-unshuffle-link").style.display = "none";
  }
  events.push("setShuffle(" + shuffleVideos + ");");
  player.setShuffle(shuffleVideos);
}

// Retrieving playlist information
/**
 * The 'getPlaylist' function returns a list of videos in a playlist.
 */
function getPlaylist() {
  var playlist = player.getPlaylist();
  if (playlist) {
    playlistVideosNode = document.getElementById("playlistvideos");
    if (playlistVideosNode) {
      while (playlistVideosNode.hasChildNodes()) {
        playlistVideosNode.removeChild(playlistVideosNode.firstChild);
      }
    }
    var listOfVideos = document.createElement("textarea");
    listOfVideos.id = "playlist-videos";
    listOfVideos.cols = 12;
    listOfVideos.rows = Math.ceil(getPlaylistCount()) + 1;
    listOfVideos.innerHTML = playlist.join(",\n");
    playlistVideosNode.appendChild(listOfVideos);
  }
}

/**
 * The 'getPlaylistIndex' function returns the playlist index position
 * of the currently playing video based on the current playlist order.
 * It calls player.getPlaylistIndex().
 * @return {number} The playlist index of the currently playing video.
 */
function getPlaylistIndex() {
  var index = player.getPlaylistIndex();
  if (!index && index != 0) {
    return "";
  }
  return index;
}

/**
 * The 'getPlaylistCount' function returns the number of videos in a
 * playlist by calling player.getPlaylist() and returning the length
 * of the array returned by that function.
 * @return {number} The number of videos in the playlist.
 */
function getPlaylistCount() {
  var playlist = player.getPlaylist();
  if (playlist) {
    return playlist.length;
  }
}

// Changing the player volume

/**
 * The 'mute' function mutes the player. It calls player.mute().
 */
function mute() {
  events.push("mute();");
  player.mute();
}

/**
 * The 'unMute' function unmutes the player. It calls player.unMute().
 */
function unMute() {
  events.push("unMute();");
  player.unMute();
}

/**
 * The 'isMuted' function determines whether the player is muted.
 * @return {string} Returns 'on' if volume is on and 'off' if volume is muted.
 */
function isMuted() {
  if (!player.isMuted()) {
    return "on";
  }
  return "off";
}

/**
 * The 'getVolume' function returns the player volume. The volume is
 * returned as an integer on a scale of 0 to 100. This function will
 * not necessarily return 0 if the player is muted. Instead, it will
 * return the volume level that the player would be at if unmuted.
 * It calls player.getVolume().
 * @return {number} A number between 0 and 100 that specifies current volume.
 */
function getVolume() {
  if (player) {
    return player.getVolume();
  }
}

/**
 * The 'setVolume' function sets the player volume.
 * @param {number} newVolume Mandatory The new player volume. The value
 *     must be an integer between 0 and 100. It calls player.setVolume(volume).
 */
function setVolume(newVolume) {
  // XSS sanitizer -- make sure volume is just numbers.
  if (xssSanitizer("Volume", newVolume, "digits")) {
    events.push("setVolume(" + newVolume + ");");
    player.setVolume(newVolume);
  }
}

// Playback status
/**
 * The 'getBytesLoaded' function returns the number of bytes loaded for
 * the current video. It calls player.getVideoBytesLoaded().
 * @return {number} The number of bytes loaded for the current video.
 */
function getBytesLoaded() {
  return player.getVideoBytesLoaded();
}

/**
 * The 'getBytesTotal' function returns the size in bytes of the currently
 * loaded/cued video. It calls player.getVideoBytesTotal().
 * @return {number} The total number of bytes in the video.
 */
function getBytesTotal() {
  return player.getVideoBytesTotal();
}

/**
 * The 'getVideoLoadedFraction' function returns the size in bytes of the currently
 * loaded/cued video. It calls player.getVideoLoadedFraction().
 * @return {number} The total number of bytes in the video.
 */
function getVideoLoadedFraction() {
  return player.getVideoLoadedFraction();
}

/**
 * The 'getStartBytes' function returns the number of bytes from which the
 * currently loaded video started loading. It calls player.getVideoStartBytes().
 * @return {number} The number of bytes into the video when the player
 *     began playing the video.
 */
function getStartBytes() {
  return player.getVideoStartBytes();
}

/**
 * The 'getPlayerState' function returns the status of the player.
 * @return {string} The current player's state -- e.g. 'playing', 'paused', etc.
 */
function getPlayerState() {
  if (player) {
    var playerState = player.getPlayerState();
    switch (playerState) {
      case 5:
        return "video cued";
      case 3:
        return "buffering";
      case 2:
        return "paused";
      case 1:
        return "playing";
      case 0:
        return "ended";
      case -1:
        return "unstarted";
      default:
        return "Status uncertain";
    }
  }
}

/**
 * The 'getCurrentTime' function returns the elapsed time in seconds from
 * the beginning of the video. It calls player.getCurrentTime().
 * @return {number} The elapsed time, in seconds, of the playing video.
 */
function getCurrentTime() {
  var currentTime = player.getCurrentTime();
  return roundNumber(currentTime, 3);
}

// Playback rate
/**
 * The 'getPlaybackRate' function returns the current playback rate of the
 * video shown in the player.
 * @return {string} The playback rate of the currently playing video.
 */
function getPlaybackRate() {
  return player.getPlaybackRate() || "";
}

/**
 * The 'setPlaybackRate' function sets the playback rate for the video.
 * It calls player.setPlaybackRate(playbackRate:String).
 * @param {string} playbackRate Mandatory The desired playback rate.
 */
function setPlaybackRate(playbackRate) {
  if (xssSanitizer("Playback rate", playbackRate, "decimal")) {
    events.push("setPlaybackRate(" + playbackRate + ");");
    player.setPlaybackRate(playbackRate);
  }
}

/**
 * The 'getAvailablePlaybackRates' function retrieves the supported playback
 * rates for the currently playing video. It calls
 * player.getAvailablePlaybackRates().
 * @return {string} A string (comma-separated values) of available playback
 *                  rates for the currently playing video.
 */
function getAvailablePlaybackRates() {
  return player.getAvailablePlaybackRates();
}

// Retrieving video information

/**
 * The 'getDuration' function retrieves the length of the video. It calls
 * player.getDuration() function.
 * @return {number} The length of the video in seconds.
 */
function getDuration() {
  return player.getDuration();
}

/**
 * The 'getVideoUrl' function returns the YouTube.com URL for the
 * currently loaded/playing video. It calls player.getVideoUrl().
 */
function getVideoUrl() {
  var videoUrl = player.getVideoUrl();
  updateHTML("videoUrl", videoUrl);
}

// Player size ... setPlayerHeight and setPlayerSize

/**
 * The 'setPlayerHeight' function calculates the height of the player
 * for the given aspect ratio and width, which are specified in the demo.
 * This ensures that the player dimensions are a legitimate aspect ratio,
 * which should make videos look nicer.
 * @param {string} aspectRatio Mandatory The aspect ratio of the player.
 *     Valid values are 'standard' (4x3) and 'widescreen' (16x9).
 * @param {number} playerWidth Mandatory The pixel-width of the player.
 */
function setPlayerHeight(aspectRatio, playerWidth) {
  // XSS sanitizer -- make sure player width is just numbers.
  if (xssSanitizer("Width", playerWidth, "digits")) {
    if (aspectRatio == "widescreen") {
      updateHTML("playerHeight", (playerWidth * 9) / 16);
    } else if (aspectRatio == "standard") {
      updateHTML("playerHeight", (playerWidth * 3) / 4);
    }
  }
}

/**
 * The 'setPlayerSize' function adjusts the size of the video and of the
 * DOM element to match the width and height set in the demo.
 * @param {number} playerWidth Mandatory The desired player width.
 * @param {number} playerHeight Mandatory The desired player width.
 */
function setPlayerSize(playerWidth, playerHeight) {
  if (xssSanitizer("Width", playerWidth, "digits")) {
    events.push("setSize(" + playerWidth + ", " + playerHeight + ");");
    player.setSize(playerWidth, playerHeight);
    document.getElementById(activePlayer).width = playerWidth;
    document.getElementById(activePlayer).height = playerHeight;
  }
}

// Retrieving video information and playback status

/**
 * The 'updateytplayerInfo' function updates the volume and
 * "Playback statistics" displayed  on the page. (It doesn't actually
 * update the player itself.) The onYouTubePlayerReady uses the
 * setInterval() function to indicate that this function should run
 * every 600 milliseconds.
 */
function updateytplayerInfo() {
  if (player) {
    updateHTML("volume", Math.round(getVolume()));

    updateHTML("videoduration", getDuration());
    updateHTML("videotime", getCurrentTime());
    updateHTML("playerstate", getPlayerState());

    updateHTML("bytestotal", getBytesTotal());
    updateHTML("startbytes", getStartBytes());
    var fraction = getVideoLoadedFraction();
    if (fraction) {
      updateHTML("percentloaded", Number(fraction.toFixed(4)));
    }
    updateHTML("playbackrate", getPlaybackRate());
    updateHTML("availableplaybackrates", getAvailablePlaybackRates());
    updateHTML("bytesloaded", getBytesLoaded());

    updateHTML("ismuted", isMuted());

    // TODO: Move calls to getPlaylistCount() and getPlaylist()
    // elsewhere since these only change when player content changes.
    if (contentType != "video" && contentType != "videolist") {
      updateHTML("playlistcount", getPlaylistCount());
      updateHTML("currentplaylistvideo", getPlaylistIndex());
      getPlaylist();
    }
  }
  if (events.length > 0) {
    updateHTML("eventhistory", "<ol><li>" + events.join("<li>") + "</ol>");
  }
  if (errors.length > 0) {
    updateHTML("errorCode", "<ol><li>" + errors.join("<li>") + "</ol>");
  }
}

function roundNumber(number, decimalPlaces) {
  decimalPlaces = !decimalPlaces ? 2 : decimalPlaces;
  return (
    Math.round(number * Math.pow(10, decimalPlaces)) /
    Math.pow(10, decimalPlaces)
  );
}

/**
 * The 'getEmbedCode' function returns the embed code for the currently
 * loaded/playing video. It then creates a node to add the embed code
 * to the page. It calls player.getVideoEmbedCode().
 *
 * This function also runs if the user updates the embedded player parameters.
 * In that case, the function modifies the sample embed code and
 * calls the redrawPlayer() function to update the sample player, too.
 */
function getEmbedCode() {
  if (player) {
    var result = player.getVideoEmbedCode();
    var iframeEmbedNode = document.getElementById("iframe-embed-code");
    if (iframeEmbedNode) {
      while (iframeEmbedNode.hasChildNodes()) {
        iframeEmbedNode.removeChild(iframeEmbedNode.firstChild);
      }
    }

    if (result) {
      // Define new element for IFrame embed content
      var newIframeEmbedNode;
      newIFrameEmbedNode = document.createElement("textarea");
      newIFrameEmbedNode.id = "iframe-embed-string";
      newIFrameEmbedNode.cols = 44;
      newIFrameEmbedNode.rows = 12;

      var playerWidth = document.getElementById("playerWidth").value;
      var playerHeight = document.getElementById("playerHeight").innerHTML;

      var argString = getEmbeddedPlayerOptions();
      var iframeArgString = argString
        ? "?" + argString.substring(1, argString.length)
        : (iframeArgString = "");
      var playerEmbeddedRegex = /feature=player_embedded/;
      if (!result.match(playerEmbeddedRegex)) {
        argString += "&feature=player_embedded";
      }

      if (
        (iframeArgString.match(/listType=/) &&
          iframeArgString.match(/list=/)) ||
        iframeArgString.match(/playlist=/)
      ) {
        // Skip adding content to <iframe> code.
        document.getElementById("embed-uses-parameters").style.display = "";
      } else {
        iframeArgString = getIFrameEmbedContent(iframeArgString);
        document.getElementById("embed-uses-parameters").style.display = "none";
      }

      newIFrameEmbedNode.value =
        '<iframe id="ytplayer" type="text/html" ' +
        'width="' +
        playerWidth +
        '" height="' +
        playerHeight +
        '"\n' +
        'src="https://www.youtube.com/embed/' +
        iframeArgString +
        '"\n' +
        'frameborder="0" allowfullscreen>';
      iframeEmbedNode.appendChild(newIFrameEmbedNode);
    }
  }
}

function getIFrameEmbedContent(iframeArgString) {
  if (contentType == "load-video" || contentType == "cue-video") {
    return playerContent + iframeArgString;
  } else if (
    contentType == "load-videolist" ||
    contentType == "cue-videolist"
  ) {
    var videoListArray = playerContent.split(",");
    var videoList = "";
    for (listItem = 1; listItem < videoListArray.length; listItem++) {
      videoList += videoListArray[listItem] + ",";
    }
    if (iframeArgString) {
      return iframeArgString.replace(
        /\?/,
        videoListArray[0] +
          "?playlist=" +
          videoList.substring(0, videoList.length - 1) +
          "&version=3&"
      );
    } else {
      return (
        videoListArray[0] +
        "?playlist=" +
        videoList.substring(0, videoList.length - 1) +
        "&version=3"
      );
    }
  } else {
    var listType = contentType.replace("load-", "");
    listType = listType.replace("cue-", "");
    if (iframeArgString) {
      return iframeArgString.replace(
        /\?/,
        "?listType=" + listType + "&list=" + playerContent + "&"
      );
    } else {
      return "?listType=" + listType + "&list=" + playerContent;
    }
  }
}

/**
 * This function writes the parameter name and tooltip for player parameters.
 * @param {string} parameterName Mandatory The name of the parameter.
 * @param {string} tooltipText Mandatory Text for the parameter's tooltip.
 * @param {string} supportedPlayers Mandatory List of supported players.
 */
function writePlayerParameter(parameterName, tooltipText, supportedPlayers) {
  document.write(
    '<tr id="' +
      parameterName +
      '-param">' +
      '<td class="noborder">' +
      parameterName +
      "&nbsp;" +
      '<a class="tooltip" href="#" onclick="return false;">' +
      '<img src="/youtube/images/icon-help.gif" alt="" />' +
      '<span class="tooltip-content tooltip-right-align">' +
      tooltipText +
      '</span></a><br/><div class="supported-players">(' +
      supportedPlayers +
      ")</div></td>"
  );
}

/**
 * This function writes a checkbox for a player parameter.
 * @param {string} parameterName Mandatory The name of the parameter.
 * @param {string} tooltipText Mandatory Text for the parameter's tooltip.
 * @param {string} supportedPlayers Mandatory List of supported players.
 * @param {string} checked Mandatory 'checked' or ''.
 */
function writePlayerParameterCheckbox(
  parameterName,
  tooltipText,
  supportedPlayers,
  checked
) {
  writePlayerParameter(parameterName, tooltipText, supportedPlayers);
  document.write(
    '<td class="noborder valignMiddle">' +
      '<input id="embedded-player-' +
      parameterName +
      '" type="checkbox" ' +
      checked +
      "/></td>"
  );
  document.write("</tr>");
}

/**
 * This function writes a checkbox for a player parameter.
 * @param {string} parameterName Mandatory The name of the parameter.
 * @param {string} tooltipText Mandatory Text for the parameter's tooltip.
 * @param {string} supportedPlayers Mandatory List of supported players.
 * @param {string} parameterValue Mandatory Default value for the parameter.
 * @param {string} inputSize Mandatory Size of the input field.
 * @param {string} additionalParams Mandatory Additional stuff to stick in
 *     the input field. '' if there's nothing additional.
 */
function writePlayerParameterTextInput(
  parameterName,
  tooltipText,
  supportedPlayers,
  parameterValue,
  inputSize,
  additionalParams
) {
  writePlayerParameter(parameterName, tooltipText, supportedPlayers);
  document.write(
    '<td class="noborder valignMiddle">' +
      '<input id="embedded-player-' +
      parameterName +
      '" type="text" ' +
      'value="' +
      parameterValue +
      '" size="' +
      inputSize +
      '" ' +
      additionalParams +
      "/>"
  );
  document.write("</td>");
  document.write("</tr>");
}

/** VALIDATION **/
/**
 * The 'sanitizePlayerContentInput' function ensures that the user
 * has entered a valid value for the requested content type.
 * @param {string} contentType Mandatory Value could be load-video, cue-video,
       load-videolist, cue-videolist, load-playlist, cue-playlist,
       load-user_uploads, cue-user_uploads.
 * @param {string} playerContent Mandatory In conjunction with the
 *     contentType value, this identifies the content the player will
 *     load. Value could be a video ID, playlist ID, username, etc.
 * @return {boolean} Indication of whether player content value is okay
 *     from XSS perspective.
 */
function sanitizePlayerContentInput() {
  if (
    ((contentType == "load-video" || contentType == "cue-video") &&
      xssSanitizer("Video ID", playerContent, "videoIdOrUrl")) ||
    ((contentType == "load-videolist" || contentType == "cue-videolist") &&
      xssSanitizer("Video IDs", playerContent, "playlist")) ||
    ((contentType == "load-playlist" || contentType == "cue-playlist") &&
      xssSanitizer("Playlist ID", playerContent, "playlistId")) ||
    ((contentType == "load-user_uploads" ||
      contentType == "cue-user_uploads") &&
      xssSanitizer("Username", playerContent, "username"))
  ) {
    return true;
  } else {
    return false;
  }
}

/**
 * The 'xssSanitizer' function tries to make sure that the user isn't being
 * directed to something that would exploit an XSS vulnerability by verifying
 * that the input value matches a particular rule. If the provided value is
 * invalid, the page will display an error indicating that either the value
 * is invalid or that it doesn't have XSS vulnerabilities to exploit.
 * @param {string} field Mandatory A name that identifies the field being
 *     validated. This will appear in the error list if the value is bad.
 * @param {string} value Mandatory The value to be validated.
 * @param {string} rulesOfSanitation Mandatory A string that identifies
 *     the accepted format of the value -- e.g. alphanumeric, digits,
 *     videoId, etc.
 * @param {boolean} skipEvent Optional A flag that indicates that the
 *     error should not be printed. This is used to avoid inadvertently
 *     displaying an error when a field could include, say, a videoId or
 *     a videoUrl.
 * @return {boolean} Returns true if the value is valid and false if not.
 */
function xssSanitizer(field, value, rulesOfSanitation, skipEvent) {
  var regex = /[\"\<\>]/;
  if (value.match(regex)) {
    errors.push("These aren't the XSS vulnerabilities you're looking for.");
    return false;
  } else if (rulesOfSanitation) {
    if (rulesOfSanitation == "alphanumeric") {
      var regex = /[\W]/;
      if (value.match(regex)) {
        errors.push(
          field +
            " &ndash; This value is not supported. " +
            "The value must be an alphanumeric string."
        );
        return false;
      }
    } else if (rulesOfSanitation == "digits") {
      var regex = /[\D]/;
      if (value.match(regex)) {
        errors.push(
          field +
            " &ndash; This value is not supported. " +
            "The value must be an integer."
        );
        return false;
      }
    } else if (rulesOfSanitation == "decimal") {
      var regex = /[0-9\.]+/;
      if (!value.match(regex)) {
        errors.push(
          field +
            " &ndash; This value is not supported. " +
            "The value must be an integer or decimal value."
        );
        return false;
      }
    } else if (rulesOfSanitation == "hl") {
      var regex = /[a-zA-Z\-\_\.]+/;
      if (!value.match(regex)) {
        errors.push(
          field +
            " &ndash; This value is not supported. " +
            "Set the value to an ISO 639-1 two-letter language code or " +
            "a fully specified locale, such as <code>fr</code> or " +
            "<code>fr-ca</code>."
        );
        return false;
      }
    } else if (rulesOfSanitation == "playlist") {
      var regex = /^[\w\-]{11}(,[\w\-]{11})*$/;
      if (!value.match(regex)) {
        errors.push(
          field +
            " &ndash; This value is not supported. " +
            "The value must be a comma-delimited " +
            "list of 11-character YouTube video IDs."
        );
        return false;
      }
    } else if (rulesOfSanitation == "playlistId") {
      var regex = /^([A-Z][A-Z])([\w\-]+)$/;
      if (!value.match(regex)) {
        errors.push(
          field +
            " &ndash; This value is not supported. " +
            "The value must be a valid YouTube playlist ID."
        );
        return false;
      }
    } else if (rulesOfSanitation == "username") {
      var regex = /[\W]/;
      if (value.match(regex)) {
        errors.push(
          field +
            " &ndash; This value is not supported. " +
            "The value must be an alphanumeric string."
        );
        return false;
      }
    } else if (rulesOfSanitation == "videoIdOrUrl") {
      if (!xssSanitizer(field, value, "videoId", true)) {
        if (!xssSanitizer(field, value, "videoUrl", true)) {
          errors.push(
            field +
              " &ndash; This value is not supported. " +
              "The value must be an 11-character YouTube video ID or " +
              "a YouTube watch page URL in the format " +
              "'https://www.youtube.com/embed/VIDEO_ID'."
          );
          return false;
        }
      }
    } else if (rulesOfSanitation == "videoId") {
      var regex = /^[\w\-]{11}$/;
      if (value.match(regex)) {
        return true;
      }
      if (!skipEvent) {
        errors.push(
          field +
            " &ndash; This value is not supported. " +
            "The value must be an 11-character YouTube video ID."
        );
      }
      return false;
    } else if (rulesOfSanitation == "videoUrl") {
      var regex = /^https?\:\/\/www.youtube.com\/embed\/([\w\-]){11}$/;
      if (value.match(regex)) {
        return true;
      }
      if (!skipEvent) {
        errors.push(
          field +
            " &ndash; This value is not supported. " +
            "The value must be a YouTube watch page URL in the " +
            "format 'https://www.youtube.com/embed/VIDEO_ID'."
        );
      }
      return false;
    }
  }
  return true;
}
