(function(win, $) {
  var defaults = {
    clsnames: {
      mainwrapper: "yvp-wr",
      playercontainer: "yvp-container",
      videotag: "yvp-video",
      controlbar: "yvp-controlbar",
      bigplaybtnwr: "yvp-bigplaybtnwr",

      // ControlBar Specific
      playbtn: "yvp-playbtn",
      playicon: "yvp-playbtn-play fa",
      volumectrlbtn: "yvp-volumebtn fa fa-volume-up",
      volumectrl: "yvp-volumectrl",
      volumeholder: "yvp-volumeholder",
      volumelevel: "yvp-volumelevel fa fa-circle",
      fullscreenbtn: "yvp-fsbtn fa fa-arrows-alt",
      progressctrl: "yvp-progressctrl",
      progressholder: "yvp-progressholder",
      playprogress: "yvp-playprogress",
      bufferprogress: "yvp-bufferprogress",
      progresstime: "yvp-progresstime",
    },
    init: [
      {
        name: 'playercontainer',
        type: PlayerContainer,
        args: ['this', 'class-playercontainer'],
        dom: {
          type: 'wrapAround',
          target: '_player'},
        callMethod: {
          method: 'init',
          args: ['this']},
      },
      {
        name: 'controlbar',
        type: ControlBar,
        args: ['this', 'class-controlbar'],
        dom: {
          type: 'appendTo',
          target: 'playercontainer'},
        callMethod: {
          method: 'init',
          args: ['this']},
      },
      {
        name: 'mainwrapper',
        type: MainWrapper,
        args: ['this', 'class-mainwrapper'],
        dom: {
          type: 'wrapAround',
          target: 'playercontainer'},
        callMethod: {
          method: 'init',
          args: ['this']}
      },
    ],
    options: {
      sources: [],
      autoplay: false,
      image: "",
      width: false,
      height: false,
      class: false,
      preload: "none",
    }
  }

  function yvp(el, options) {
    return new YVideoPlayer(el, options);
  }

  function YVideoPlayer(el, options) {
    this._player;
    this._elements = {}
    this._eventlist = [];

    $.extend(defaults.options, options);

    this.init = function(id) {
      var _el = $('#' + id);
      el = $('<video x-webkit-airplay="allow" webkit-playsinline controls/>');
      el.attr('id', id);
      el.attr('src', defaults.options.sources[0]['file']);
      el.attr('preload', defaults.options.preload);
      if(defaults.options.width) {
        el.attr('width', defaults.options.width);
      }
      if(defaults.options.height) {
        el.attr('height', defaults.options.height);
      }
      if(defaults.options.class) {
        el.addClass(defaults.options.class);
      }
      if(defaults.options.image) {
        el.attr('poster', defaults.options.image);
      }
      _el.replaceWith(el);

      // Init Specific
      this._init_videotag = function(el) {
        this._player = new PlayerElement(this, el);
        this._player.toggleDefaultControls();
        this._player.addClass(defaults.clsnames.videotag);
      }

      function _initArgs(obj, args, first) {
        var new_args = [];
        if(!first) {
          new_args.unshift(null);
        }
        for(var i in args) {
          if(args[i] === 'this') {
            new_args.push(obj);
          } else if(args[i].startsWith('class-')) {
            var clsname = args[i].split('-')[1];
            new_args.push(defaults.clsnames[clsname]);
          }
        }
        return new_args;
      }

      this._doInitialize = function() {
        for(var i in defaults.init) {
          var data = defaults.init[i];
          var obj = new (Function.prototype.bind.apply(
                         data.type, _initArgs(this, data.args)));
          var dom = data.dom;
          var target = (dom.target === '_player')
            ? this._player : this.getElement(dom.target);
          obj[dom.type](target);
          if(data.hasOwnProperty('callMethod')) {
            var methodargs = _initArgs(this, data.callMethod.args, true);
            obj[data.callMethod.method].apply(obj, methodargs);
          }
          this.addElement(obj, data.name);
        }
      }
 
      this._init_videotag(el);
      this._doInitialize();

      if(defaults.options.autoplay) {
        this._player.play();
      }
    }

    this.addEvent = function(type, cb) {
      var types = type.split(' ');
      for(var i=0; i < types.length; i++) {
        if(!this._eventlist[types[i]]) {
          this._eventlist[types[i]] = [];
        }
        if(this._eventlist[types[i]].indexOf(cb) === -1) {
          this._eventlist[types[i]].push(cb);
        }
      }
    }

    this.dispatchEvent = function(e) {
      var list = this._eventlist[e.type];
      if(list) {
        if(!e.target) {
          e.target = this;
        }
        for(var i in list) {
          list[i](e);
        }
      }
    }

    this.addElement = function(obj, name) {
      this._elements[name] = obj;
    }

    this.getElement = function(name) {
      return this._elements[name];
    }

    this.init(el);
  }

  // The main video element
  function PlayerElement(yvp, el) {
    this._el = el;
    this._yvp = yvp;

    this.init = function() {
      this._yvp.addEvent('playPause', this.playPause.bind(this));

      this.element()[0].ontimeupdate = function(e) {
        this._yvp.dispatchEvent({type: 'timeupdate', target: this});
      }.bind(this);

      this.element()[0].onprogress = function(e) {
        this._yvp.dispatchEvent({type: 'progress', target: this});
      }.bind(this);

      this.element()[0].onwaiting = function(e) {
        this._yvp.dispatchEvent({type: 'buffering', target: this});
      }.bind(this);

      this.element()[0].onplaying = function(e) {
        this._yvp.dispatchEvent({type: 'playing', target: this});
      }.bind(this);
    }

    this.toggleDefaultControls = function(show) {
        this[show ? 'addAttr' : 'removeAttr']('controls');
    }

    this.play = function() {
      // Now the video is playing so we can set the play icon to pause
      this._yvp.dispatchEvent({type: 'play', target:this}); 
      this.element()[0].play().then(function() {
        this._yvp.dispatchEvent({type: 'playpromise', target:this}); 
      }.bind(this)).catch(function(error) {
          this._yvp.dispatchEvent({type: 'pause', target:this});
        }.bind(this));
    }

    this.pause = function() {
      this.element()[0].pause();
      // Now the video is paused so we can set the pause icon to play
      this._yvp.dispatchEvent({type: 'pause', target:this});
    }

    this.setVolume = function(vol) {
      this.element()[0].volume = vol;
    }

    this.getData = function(prop) {
      return this.element()[0][prop];
    }

    this.seekTo = function(seconds) {
      if(!this.duration()) seconds = 0;
      if(seconds > this.duration()) seconds = this.duration()-1;
      this.element()[0].currentTime = seconds;
    }

    this.currentTime = function() {
      return this.element()[0].currentTime;
    }

    this.duration = function() {
      return this.element()[0].duration;
    }

    this.paused = function() {
      return this.element()[0].paused;
    }

    this.ended = function() {
      return this.element()[0].ended;
    }

    this.playPause = function() {
      if (this.paused() || this.ended()) {
        this.play();
      } else {
        this.pause();
      }
    }

    this.init();
  };

  function Container(yvp, clsname) {
    inherit(this, arguments);
  }

  function PlayerContainer() {
    inherit(this, arguments);
    
    this.init = function() {
      var playbtn = new Container(this._yvp, 'yvp-bigplaybtn', this);
      var playbtnicon = new Container(this._yvp, 'yvp-bigplaybtn-i fa fa-play', this);
      this._bigPlayBtn = new Container(this._yvp, defaults.clsnames.bigplaybtnwr, this);
      this._bigPlayBtn.appendTo(this);
      playbtn.appendTo(this._bigPlayBtn);
      playbtnicon.appendTo(playbtn);

      var cicontainer = new Container(this._yvp, 'yvp-center-icon-container', this);
      var ciicon = new Container(this._yvp, 
                                 'yvp-center-icon-i yvp-buffering fa fa-spinner',
                                 this);
      this._centerIcon = new Container(this._yvp, 'yvp-center-icon-wr', this);
      this._centerIcon.appendTo(this);
      cicontainer.appendTo(this._centerIcon);
      ciicon.appendTo(cicontainer);

      win.document.addEventListener(screenfull.raw.fullscreenchange, function() {
        this._toggleFullscreen();
      }.bind(this));

      this.onClick(function(e) {
        if(e.target == this._yvp._player.element()[0]) {
          this._yvp._player.playPause();
        }
      }.bind(this));

      this.addEvent('playpromise playing', function() {
        this._centerIcon.removeClass('visible');
      }.bind(this));
      this.addEvent('buffering', function() {
        this._centerIcon.addClass('visible');
      }.bind(this));

      this.addEvent('play', function() {
        this._centerIcon.addClass('visible');
        this._bigPlayBtn.remove();
      }.bind(this));
      this._bigPlayBtn.onClick(function() {
        this._yvp._player.playPause();
      }.bind(this));
    }

    this._enterFullscreen = function() {
      this.element().addClass('yvp-fullscreen');
    }

    this._exitFullscreen = function() {
      this.element().removeClass('yvp-fullscreen');
    }

    this._toggleFullscreen = function() {
      if(screenfull.isFullscreen) {
        this._enterFullscreen();
      } else {
        this._exitFullscreen();
      }
    }
  }

  function ControlBar() {
    inherit(this, arguments);

    this._playbtn;
    this._progressctrl;
    this._fsbtn;
    this._mousemove_timeout = false;

    this.init = function() {
      // Play Button
      this._playbtn = new PlayBtn(this._yvp, defaults.clsnames.playbtn, this);
      this._playbtn.appendTo(this).init();

      // Volume Control
      this._volumectrl = new VolumeControlBtn(this._yvp, defaults.clsnames.volumectrlbtn, this);
      this._volumectrl.appendTo(this).init();

      // Progress Control
      this._progressctrl = new ProgressControl(this._yvp, defaults.clsnames.progressctrl, this);
      this._progressctrl.appendTo(this).init();

      // Fullscreen Button
      this._fsbtn = new FullScreenBtn(this._yvp, defaults.clsnames.fullscreenbtn, this);
      this._fsbtn.appendTo(this).init();

      this.addEvent('showcontrols', function(e) {
        if(this._mousemove_timeout) {
          clearTimeout(this._mousemove_timeout);
        }
        if(this.hasClass('hidden')) {
          this.removeClass('hidden');
        }
        this._mousemove_timeout = setTimeout(function() {
          this.addClass('hidden');
          this.dispatchEvent({type: 'hidecontrols', target: this});
        }.bind(this), 2500);
      }.bind(this));
    }
  }

  function PlayBtn() {
    inherit(this, arguments);
    this._icon;

    this.init = function() {
      this._icon = new Container(this._yvp, defaults.clsnames.playicon);
      this._icon.appendTo(this);

      this.addEvent('play', this.showPause.bind(this));
      this.addEvent('pause', this.showPlay.bind(this));

      this.element().click(function() {
        this.dispatchEvent({type:'playPause'});
      }.bind(this));
    }

    this.showPause = function() {
        this._icon.removeClass('yvp-playbtn-play').addClass('yvp-playbtn-pause');
    }

    this.showPlay = function() {
        this._icon.removeClass('yvp-playbtn-pause').addClass('yvp-playbtn-play');
    }
  }

  function VolumeControlBtn() {
    inherit(this, arguments);

    function VolumeControl() {
      inherit(this, arguments);
      this._isDragging = false;

      this.init = function() {
        this.onMouseDown(function(e) {
          this._isDragging = true;
          this._handleVolumeChange(e);
        }.bind(this));
        this.onMouseMove(function(e) {
          if(this._isDragging) this._handleVolumeChange(e);
        }.bind(this));
        $(win.document).mouseup(function() {
          this._isDragging = false;
        }.bind(this));
      }

      this._handleVolumeChange = function(e) {
        var $tgt = $(e.currentTarget).find('.yvp-volumeholder');
        var height = $tgt.height();
        var yPos = height - (e.pageY - $tgt.offset().top);
        if(yPos < 0) yPos = 0;
        if(yPos > height) yPos = height;

        var percent = (yPos / height) * 100;
        this._parent._volumelevel.setLevel(percent);
      }
    }

    function VolumeLevel() {
      inherit(this, arguments);

      this.init = function() {
        this.setLevel(this._yvp._player.element()[0].volume * 100);
      }

      this.setLevel = function(percent) {
        if(percent > 40) {
          this._parent.removeClass('fa-volume-down fa-volume-off').addClass('fa-volume-up');
        } else if(percent < 39 && percent > 20) {
          this._parent.removeClass('fa-volume-up fa-volume-off').addClass('fa-volume-down');
        } else if(percent < 19) {
          this._parent.removeClass('fa-volume-up fa-volume-down').addClass('fa-volume-off');
        }
        if(percent < 5) {
          this._yvp._player.setVolume(0);
          this.element().height('0%');
        } else {
          this._yvp._player.setVolume(percent / 100);
          this.element().height(percent + '%');
        }
      }
    }
    DOMManipulationFacade(VolumeControl);
    DOMManipulationFacade(VolumeLevel);

    this.init = function() {
      this._volumewr = new VolumeControl(this._yvp, defaults.clsnames.volumectrl, this);
      this._volumewr.appendTo(this);

      this._volumeholder = new Container(this._yvp, defaults.clsnames.volumeholder, this);
      this._volumeholder.appendTo(this._volumewr);

      this._volumelevel = new VolumeLevel(this._yvp, defaults.clsnames.volumelevel, this);
      this._volumelevel.appendTo(this._volumeholder).init();

      this._volumewr.init();
    }
  }


  function ProgressControl() {
    inherit(this, arguments);

    function PlayProgress() {
      inherit(this, arguments);

      this.setProgress = function(percent) {
        this.element().width(percent + "%");
      }
    }

    function BufferProgress() {
      inherit(this, arguments);

      this.setProgress = function(percent) {
        this.element().width(percent + "%");
      }
    }

    function DurationTime() {
      inherit(this, arguments);

      this.init = function() {
        this.element().append($('<span>00:00</span>'));
      }
      
      this.setTime = function(duration) {
        this.setHtml(calculateTime(duration, duration));
      }

      this.setHtml = function(html) {
        this.element().find('span').html(html);
      }
    }

    function ProgressTime() {
      inherit(this, arguments);

      this.init = function() {
        this.element().append($('<span>00:00</span>'));
      }

      this.setTime = function(current, duration) {
        this.setHtml(calculateTime(current, duration));
      }

      this.setHtml = function(html) {
        this.element().find('span').html(html);
      }
    }
    DOMManipulationFacade(BufferProgress);
    DOMManipulationFacade(PlayProgress);
    DOMManipulationFacade(ProgressTime);
    DOMManipulationFacade(DurationTime);

    this.init = function() {
      this._holder = new Container(this._yvp, defaults.clsnames.progressholder);
      this._holder.appendTo(this);

      this._bufferprogress = new BufferProgress(this._yvp, defaults.clsnames.bufferprogress);
      this._bufferprogress.appendTo(this._holder);

      this._playprogress = new PlayProgress(this._yvp, defaults.clsnames.playprogress);
      this._playprogress.appendTo(this._holder);
      this._playprogress.addClass('fa fa-circle');

      this._progresstime = new ProgressTime(this._yvp, defaults.clsnames.progresstime);
      this._progresstime.insertBefore(this).init();

      this._durationtime = new DurationTime(this._yvp, defaults.clsnames.progresstime);
      this._durationtime.appendTo(this._parent).init();

      this.addEvent('timeupdate', function(e) {this._handleTimeUpdate(e)}.bind(this));
      this.onClick(function(e) {this._handleSeek(e)}.bind(this));
      this.addEvent('progress', function(e) {this._handleProgress(e)}.bind(this));
    }

    this._handleProgress = function(e) {
      var player = e.target.element()[0];
      if (player.buffered.length < 1) return;
      var index = 0;
      for(var i=0; i < player.buffered.length; i++) {
        if(player.currentTime > player.buffered.start(i) 
            && player.currentTime < player.buffered.end(i)) {
          index = i;
          break;
        }
      }
      var end = player.buffered.end(index);
      this._bufferprogress.setProgress((end / player.duration) * 100);
    }

    this._handleSeek = function(e) {
      var $tgt = $(e.currentTarget).find('.yvp-progressholder');
      var xPos = e.pageX - $tgt.offset().left;
      var width = $tgt.width();
      if(xPos < 0) xPos = 0;
      if(xPos > width) xPos = width;

      var percent = (xPos / width) * 100;

      this._playprogress.setProgress(percent);
      this._yvp._player.seekTo(this._yvp._player.duration() * (percent/100));
    }

    this._handleTimeUpdate = function(e) {
      var current = e.target.currentTime();
      var duration = e.target.duration();
      this._playprogress.setProgress((current / duration) * 100);
      this._progresstime.setTime(current, duration);
      this._durationtime.setTime(duration);
    }
  }

  function FullScreenBtn() {
    inherit(this, arguments);

    this.init = function() {
      this.element().click(function() {
        this.dispatchEvent({type: "toggleFullscreen"});
      }.bind(this));
    }
  }

  // Gotta wrap 'em all
  function MainWrapper() {
    inherit(this, arguments);

    this.init = function() {
      this.addEvent('toggleFullscreen', this.toggleFullscreen.bind(this));
      this.addEvent('play', function() {
        this._hideBigBtn();
      }.bind(this));

      this.onMouseMove(function() {
        this.dispatchEvent({type: 'showcontrols', target: this});
      }.bind(this));
    }

    this._hideBigBtn = function() {
      if(!this.hasClass('yvp-played')) {
        this.addClass('yvp-played');
      }
    }

    this.toggleFullscreen = function() {
      if (screenfull.enabled) {
        if (!screenfull.isFullscreen) {
          screenfull.request(this.element()[0]);
        } else {
          screenfull.exit();
        }
      }
    }
  }

  // Helpers
  function argstoarray(args) {
    args = [].slice.call(args);
    args.unshift(null);
    return args;
  }

  function inherit(obj, args) {
    obj._yvp = args[0];
    obj._el = $('<div class="'+args[1]+'"/>');
    if(args[2]) {
      obj._parent = args[2];
    }
  }

  function isundefined(input) {
    return input !== null && typeof input === 'undefined';
  }

  function calculateTime(time, duration) {
    var secs = parseInt(time % 60);
    var mins = parseInt((time / 60) % 60);
    var hours = parseInt(((time / 60) / 60) % 60);
    var displayHours = (parseInt(((duration / 60) / 60) % 60) > 0);
    secs = ('0' + secs).slice(-2);
    mins = ('0' + mins).slice(-2);
    return (displayHours ? hours + ':' : '') + mins + ':' + secs;
  }

  function DOMManipulationFacade(src) {
    src.prototype.element = function() {
      return this._el;
    }
    src.prototype.append = function(obj) {
      this.element().append(obj.element());
      return this;
    }
    src.prototype.appendTo = function(obj) {
      this.element().appendTo(obj.element());
      return this;
    }
    src.prototype.insertBefore = function(obj) {
      this.element().insertBefore(obj.element());
      return this;
    }
    src.prototype.wrapAround = function(obj) {
      this.insertBefore(obj).append(obj);
      return this;
    }
    src.prototype.remove = function() {
      this.element().remove();
    }
    src.prototype.addAttr = function(attr, val) {
      this.element().addAttr(attr, val);
      return this;
    }
    src.prototype.removeAttr = function(attr) {
      this.element().removeAttr(attr);
      return this;
    }
    src.prototype.addClass = function(clsname) {
      this.element().addClass(clsname);
      return this;
    }
    src.prototype.removeClass = function(clsname) {
      this.element().removeClass(clsname);
      return this;
    }
    src.prototype.hasClass = function(clsname) {
      return this.element().hasClass(clsname);
    }
    src.prototype.addEvent = function() {
      return this._yvp.addEvent.apply(this._yvp, arguments);
    }
    src.prototype.dispatchEvent = function() {
      return this._yvp.dispatchEvent.apply(this._yvp, arguments);
    }

    src.prototype.onClick = function(cb) {
      return this.element().click(cb);
    }
    src.prototype.onMouseDown = function(cb) {
      return this.element().mousedown(cb);
    }
    src.prototype.onMouseMove = function(cb) {
      return this.element().mousemove(cb);
    }
    src.prototype.onMouseUp = function(cb) {
      return this.element().mouseup(cb);
    }
  }

  DOMManipulationFacade(Container);
  DOMManipulationFacade(ControlBar);
  DOMManipulationFacade(MainWrapper);
  DOMManipulationFacade(PlayerElement);
  DOMManipulationFacade(PlayBtn);
  DOMManipulationFacade(VolumeControlBtn);
  DOMManipulationFacade(FullScreenBtn);
  DOMManipulationFacade(PlayerContainer);
  DOMManipulationFacade(ProgressControl);

  win.vp = yvp;
})(window, jQuery)
