/*
    webaudiosequencer.js 0.0.1
    http://www.devportfolio.net

    The MIT License (MIT)

    Copyright (c) <year> <copyright holders>

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
*/
; ( function () {

    "use strict";


    /* ----------------------------------------------------------------    
     *      HELPER    
     * ---------------------------------------------------------------- */


    /**
	 * Interface Class Mecanism
	 * 
	 * @param <String> name		: Interface name
	 * @param <String> methods  : Methods name
	 *
	 * @return <>
	 */
    function Interface( name, methods ) {

        if ( arguments.length !== 2 ) {
            throw new Error( 'Interface constructor called with ' + arguments.length + ' arguments, but expected exactly 2.' );
        }

        this.name = name;
        this.methods = [];

        for ( var i = 0, len = methods.length; i < len; i += 1 ) {
            if ( typeof methods[i] !== 'string' ) {
                throw new Error( 'Interface constructor expects method names to be passed in as a string.' );
            }

            this.methods.push( methods[i] );
        }
    };

    /**
	 * ensureImplements static method ensure object parameter implements Interface methods
	 * 
	 * @param <Object> object	: object to check	 
	 *
	 * @return <>
	 */
    Interface.ensureImplements = function ensureImplements( object ) {

        if ( arguments.length < 2 ) {
            throw new Error( 'Function Interface.ensureImplements called with ' +
				arguments.length + 'arguments, but expected at least 2.' );
        }

        for ( var i = 1, len = arguments.length; i < len; i += 1 ) {
            var _interface = arguments[i];

            if ( _interface.constructor !== Interface ) {
                throw new Error( 'Function Interface.ensureImplements expects arguments ' +
					'two and above to be instances of Interface.' );
            }

            for ( var j = 0, methodsLen = _interface.methods.length; j < methodsLen; j += 1 ) {
                var method = _interface.methods[j];

                if ( !object || !object[method] || typeof object[method] !== 'function' ) {
                    throw new Error( 'Function Interface.ensureImplements: object ' +
						'does not implement the ' + _interface.name +
						' interface. Method ' + method + ' was not found.' );
                }
            }
        }
    };

    /**
	 * extend() method implements inheritance mechanism
	 * 
	 * @param <Object> subClass	  : Child class
	 * @param <Object> superClass : Master class
	 *
	 * @return <>
	 */
    var extend = function extend( subClass, superClass ) {

        var F = function () { };

        F.prototype = superClass.prototype;
        subClass.prototype = new F();
        subClass.prototype.constructor = subClass;
        subClass.superclass = superClass.prototype;

        if ( superClass.prototype.constructor === Object.prototype.constructor ) {
            superClass.prototype.constructor = superClass;
        }
    };

    /**
     * clear() empty an array
     * 
     * @param <>
     *
     * @return <>
     */
    Array.prototype.clear = function () {
        while ( this.length > 0 ) {
            delete this.pop();
        }
    };

    /* ----------------------------------------------------------------    
     *      CORE   
     * ---------------------------------------------------------------- */


    var IAudioEventProcessor = new Interface( 'IAudioEventProcessor', ['processEvents'] );
    var IAudioProcessor = new Interface( 'IAudioProcessor', ['process'] );
    var Composite = new Interface( 'Composite', ['add', 'remove', 'getChildIndex'] );

    /**
	 * AudioContext Class 
	 * 
	 * @param <>
	 * @param <>
	 *
	 * @return <>
	 */
    var WebAudioContext = function () {

        if ( !WebAudioContext.instance ) {

            var AudioContext = null;

            try {

                AudioContext = window.AudioContext || window.webkitAudioContext;
                WebAudioContext.instance = new AudioContext();
            }
            catch ( error ) {

                throw new Error( error );
            }
        }

        return WebAudioContext.instance;
    };

    /**
	 * AudioEngine Singleton process IAudioEventProcessor and IAudioProcessor objects
	 * 
	 * @param <>
	 * @param <>
	 *
	 * @return <>
	 */
    var AudioEngine = ( function AudioEngine() {

        // Private attributes :
        var _eventGenerator = [],  	/* : IAudioEventProcessor */
            _generators = [], 		/* : IAudioProcessor */
            _effects = [], 			/* : IAudioProcessor */
            _position = 0,
            _playing = false,
            _bpm = 160,
            _sampleRate = 44100,
            _listener = null;

        /**
		 * numSamplesToBars()
		 *
         * @param <Number> numSamples : how many samples into the pattern or song (at 44100 sample rate, so 88200 for 1 measure)
         * @param <Number> bpm : Beats Per Minute
		 *
         * @return <Number> position in pattern or song (1 = one measure of four beats)
         */
        var numSamplesToBars = function numSamplesToBars( numSamples, bpm ) {

            return ( numSamples * bpm / 240.0 ) / _sampleRate;
        };

        return {

            addEventGenerator: function ( anEventGenerator /* : IAudioEventProcessor */ ) {

                Interface.ensureImplements( anEventGenerator, IAudioEventProcessor );
                _eventGenerator.unshift( anEventGenerator );
            },

            removeEventGenerator: function ( anEventGenerator /* : IAudioEventProcessor */ ) {

                Interface.ensureImplements( anEventGenerator, IAudioEventProcessor );

                var index = _eventGenerator.indexOf( anEventGenerator );

                if ( index >= 0 ) {

                    var audioEventProcessor = _eventGenerator.splice( index, 1 );
                }
            },

            clearEventGenerator: function () {

                for ( var i = 0, count = _eventGenerator.length; i < count; i += 1 ) {

                    if ( _eventGenerator[i] instanceof AudioEventProcessor ) {

                        _eventGenerator[i].clear();
                    }
                }

                _eventGenerator.clear();
            },

            getEventGenerator: function () {

                return _eventGenerator;
            },

            addGenerator: function ( aGenerator /* : IAudioProcessor */ ) {

                Interface.ensureImplements( aGenerator, IAudioProcessor );
                _generators.unshift( aGenerator );
            },

            addEffect: function ( anEffect /* : IAudioProcessor */ ) {

                Interface.ensureImplements( anEffect, IAudioProcessor );
                _effects.unshift( anEffect );
            },

            isPlaying: function () {

                return _playing;
            },

            start: function () {

                _playing = true;
                _position = 0;
            },

            stop: function () {

                setTimeout( function () {
                    _generators.clear();
                }, 500 );

                _playing = false;
            },

            setBPM: function ( value ) {

                _bpm = value;
            },

            getBPM: function () {

                return _bpm;
            },

            setSampleRate: function ( value ) {

                _sampleRate = value;
            },

            getSampleRate: function () {

                return _sampleRate;
            },

            listen: function ( callback ) {

                if ( typeof callback === 'function' ) {
                    _listener = callback;
                }
            },

            dispatch: function ( e ) {

                if ( _listener ) {
                    setTimeout( function () {
                        _listener.call( this, e.object );
                    }, e.time );
                }
            },

            process: function ( buffer ) {

                var endPosition = _position + numSamplesToBars( AudioDriver.getBufferSize(), _bpm );

                var i = 0,
                    g = [],
                    n = _eventGenerator.length;

                // don't add new events if the playback is stopped
                if ( !_playing ) {
                    n = 0;
                }

                while ( --n > -1 ) {
                    g = _eventGenerator[n].processEvents( _position, endPosition );
                    _generators = g.concat( _generators );
                }

                n = _generators.length;

                while ( --n > -1 ) {
                    if ( _generators[n].process( buffer ) ) {
                        _generators.splice( n, 1 );
                    }
                }

                n = _effects.length;

                while ( --n > -1 ) {
                    _effects[i].process( buffer );
                }

                _position = endPosition;
            },
        };

    }() );

    /**
	 * AudioDriver Singleton
	 * 
	 * @param <>
	 * @param <>
	 *
	 * @return <>
	 */
    var AudioDriver = ( function AudioDriver() {

        // Private attributes :
        var _audioContext = null,
            _audioProcessor = null,
            _audioGainNode = null,
            _listener = null,
            _BUFFER = null,
            _ZEROS_BUFFER = null,
            _BUFFER_SIZE = 1024;

        try {
            _audioContext = new WebAudioContext();
        }
        catch ( e ) {
            throw new Error( e );
        }

        return {

            init: function () {

                try {

                    if ( _audioProcessor === null ) {

                        //256, 512, 1024, 2048, 4096, 8192, 16384
                        _audioProcessor = _audioContext.createScriptProcessor( _BUFFER_SIZE );

                        // _BUFFER is fill by AudioEngine object
                        _BUFFER = _audioContext.createBuffer( 2, _audioProcessor.bufferSize, AudioEngine.getSampleRate() );

                        // _BUFFER is fill by AudioEngine object
                        _ZEROS_BUFFER = _audioContext.createBuffer( 2, _audioProcessor.bufferSize, 44100 );

                        for ( var i = 0; i < _BUFFER_SIZE; i += 1 ) {

                            _ZEROS_BUFFER.getChannelData( 0 )[i] = 0.0;
                            _ZEROS_BUFFER.getChannelData( 1 )[i] = 0.0;
                        }

                        _audioProcessor.onaudioprocess = function ( event ) {

                            var output = event.outputBuffer,
                            outputL = output.getChannelData( 0 ),
                            outputR = output.getChannelData( 1 );

                            var l = _BUFFER.getChannelData( 0 ),
                                r = _BUFFER.getChannelData( 1 );

                            l.set( _ZEROS_BUFFER.getChannelData( 0 ) );
                            r.set( _ZEROS_BUFFER.getChannelData( 1 ) );

                            AudioEngine.process( _BUFFER );

                            outputL.set( l );
                            outputR.set( r );

                            if ( _listener ) {
                                _listener.call();
                            }
                        };

                        //
                        _audioGainNode = _audioContext.createGain();

                        //
                        _audioProcessor.connect( _audioGainNode );

                        // The compressor sends samples to the hardware.
                        _audioGainNode.connect( _audioContext.destination );
                    }
                }
                catch ( e ) {
                    throw new Error( e );
                }
            },

            listen: function ( callback ) {

                if ( typeof callback === 'function' ) {
                    _listener = callback;
                }
            },

            getBufferSize: function () {

                if ( !( _audioProcessor || _audioProcessor.bufferSize ) ) {
                    throw new Error( 'AudioDriver.init() method must be called before...' );
                }

                return _audioProcessor.bufferSize;
            },

            setBufferSize: function ( value ) {

                _BUFFER_SIZE = value;
            },

            getGainValue: function () {

                return _audioGainNode.gain.value;
            },

            setGainValue: function ( value ) {

                _audioGainNode.gain.value = value;
            },
        };

    }() );

    /**
	 * AudioExtractor Class
	 * 
	 * @param <Number> deltaSamples : offset into the buffer where to start writing
	 * @param <AudioBuffer> audioBuffer : AudioBuffer of which to play a slice
	 * @param <Number> gain
	 *
	 * @return <AudioExtractor> 
	 */
    var AudioExtractor = function ( deltaSamples, audioBuffer, gain ) {

        /* Public */
        this._deltaSamples = deltaSamples;
        this._gain = gain / 127;

        /* Check audioBuffer */
        if ( !( audioBuffer && audioBuffer.length > 0 ) ) {
            throw new Error( 'audioBuffer is undefined.' );
        }

        this._audioBufferSize = audioBuffer.length,
        this._audioBufferL = audioBuffer.getChannelData( 0 ),
        this._audioBufferR = audioBuffer.getChannelData( 1 ),
        this._currentSampleIndex = 0;
    };

    AudioExtractor.prototype = {

        /**
		 * process()
		 *
		 * @param buffer <AudioBuffer> : stereo buffer of AudioDriver.BUFFER_SIZE number of samples
		 *
		 * @return Boolean : true if the playback is done and this generator can be removed
		 */
        process: function ( buffer ) {

            var l = buffer.getChannelData( 0 ),
                r = buffer.getChannelData( 1 ),
                gain = Number(( this._gain ).toFixed( 1 ) ),
                buffersize = AudioDriver.getBufferSize();

            for ( var i = this._deltaSamples; i < buffersize; i += 1 ) {
                if ( this._currentSampleIndex > ( this._audioBufferSize - 1 ) ) break;

                l[i] += this._audioBufferL[this._currentSampleIndex] * gain;
                r[i] = l[i];

                this._currentSampleIndex++;
            }

            for ( ; i < buffersize; i += 1 ) {
                l[i] = 0.0;
                r[i] = 0.0;
            }

            this._deltaSamples = 0;

            if ( this._currentSampleIndex >= this._audioBufferSize ) return true;

            return false;
        }
    };

    /**
	 * AudioLoader Singleton loads sounds into an AudioBuffer array
	 * 
	 * @param <>
	 *
	 * @return <> 
	 */
    var AudioLoader = ( function () {

        var _audiobufferlist = [];
        var _loadingUrl = [];
        var _loadComplete = null;

        var _call = function ( callback, args ) {

            if ( typeof callback === "function" ) {
                callback.call( null, args );
            }
            else {
                throw new Error( 'a callback must be define' );
            }
        };

        var _load = function ( url, success, error ) {

            var r = new XMLHttpRequest(),
				ac = new WebAudioContext();

            r.open( 'GET', url, true );
            r.responseType = 'arraybuffer';

            r.onreadystatechange = function () {

                if ( r.readyState !== 4 ) return;

                if ( r.response === null ) {
                    _call( error );
                    return;
                }

                ac.decodeAudioData( r.response,

					function ( buffer ) {
					    _audiobufferlist[url] = buffer;
					    _call( success, buffer );
					    _checkLoadComplete( url );
					},

					function () {
					    _call( error );
					}
				);

                r = null;
            };

            r.send();
        };

        var _checkLoadComplete = function ( url ) {

            var index = _loadingUrl.indexOf( url );

            if ( index >= 0 ) {

                _loadingUrl.splice( index, 1 );
            }

            if ( _loadComplete && _loadingUrl.length <= 0 ) {
                _loadComplete.call();
            }
        };

        return {

            load: function ( url, success, error ) {

                if ( _audiobufferlist[url] ) { // already exist

                    _call( success, _audiobufferlist[url] );    // return AudioBuffer in success callback
                    _checkLoadComplete( url );
                }
                else { // load sound with an XMLHttpRequest

                    _load( url, success, error );
                    _loadingUrl.push( url );
                }
            },

            onLoadComplete: function ( callback ) {

                if ( typeof callback === 'function' ) {
                    _loadComplete = callback;
                }
            },
        };

    }() );


    /* ----------------------------------------------------------------    
     *      AUDIO PROCESSORS   
     * ---------------------------------------------------------------- */


    /**
	 * AudioEventProcessor is an abstract class 
	 * 
	 * @param <>
	 *
	 * @return <> 
	 */
    var AudioEventProcessor = function () {

        this._children = [];
    };

    AudioEventProcessor.prototype = { // Implements Composite, IAudioEventProcessor

        add: function ( child ) {
            Interface.ensureImplements( child, Composite, IAudioEventProcessor );

            this._children.push( child );
            return this;
        },

        remove: function ( child ) {
            Interface.ensureImplements( child, Composite, IAudioEventProcessor );

            var index = this._children.indexOf( child );

            if ( index >= 0 ) {

                if ( this._children[index] instanceof AudioEventProcessor ) {

                    child.clear();
                }

                this._children.splice( index, 1 )
            }
        },

        clear: function () {

            for ( var i = 0, len = this._children.length; i < len; i += 1 ) {

                if ( this._children[i] instanceof AudioEventProcessor ) {

                    this._children[i].clear();
                }
            }

            this._children.clear();
        },

        getChildren: function () {

            return this._children;
        },

        getChildIndex: function ( index ) {

            return this._children[index];
        },

        /**
		 * processEvents() checks for audio events that should start within the duration of the buffer		 		
		 *
		 * @param <Number> inFromPosition : start position (where 1 is one bar)
		 * @param <Number> inToPosition : end position (where 1 is one bar)
		 *
		 * @return IAudioProcessor[] : array with all generators that should start to play within the buffer length
		 */
        processEvents: function ( inFromPosition, inToPosition ) {

            var generators = [];
            var childLength = this._children.length;

            for ( var i = 0; i < childLength; i += 1 ) {
                generators = generators.concat( this._children[i].processEvents( inFromPosition, inToPosition ) );
            }

            return generators;
        }
    };

    /**
	 * AudioEvent leaf Class 
	 * 
	 * @param  <Number> time : 
	 * @param  <String> soundurl : 
	 *
	 * @return <AudioEvent>   
	 */
    var AudioEvent = ( function () {

        /**
		 * barsToNumSamples()
		 *
		 * @param <Number> bars : position in pattern or song (1 = one measure of four beats)
		 * @param <Number> bpm : Beats Per Minute
		 *
		 * @return <Number> how many samples into the pattern or song (at 44100 sample rate, so 88200 for 1 measure)
		 */
        var barsToNumSamples = function ( bars, bpm ) {

            return ( bars * 240.0 / bpm ) * AudioEngine.getSampleRate();
        }

        var AudioEvent = function AudioEvent( time, soundurl, gain ) {

            var _this = this;

            this._time = time;
            this._url = soundurl;
            this._loaded = false;
            this._buffer = null;
            this._gain = gain ? gain : 80;

            var onsuccess = function onsuccess( buffer ) {
                _this._buffer = buffer;
                _this._loaded = true;
            };

            var onerror = function onerror() {
                _this._buffer = null;
                _this._loaded = false;
            };

            AudioLoader.load( this._url, onsuccess, onerror );
        };

        AudioEvent.prototype = { // Implements Composite, IAudioEventProcessor

            add: function () {

            },

            remove: function () {

            },

            getChildIndex: function () {

            },

            getGain: function () {
                return this._gain;
            },

            setGain: function ( value ) {
                this._gain = value;
            },

            /**
			 * processEvents() checks for audio events that should start within the duration of the buffer		 		
			 *
			 * @param <Number> inFromPosition : start position (where 1 is one bar)
			 * @param <Number> inToPosition : end position (where 1 is one bar)
			 *
			 * @return IAudioProcessor[] : array with all generators that should start to play within the buffer length
			 */
            processEvents: function ( inFromPosition, inToPosition ) {

                // IAudioProcessor to be filled with generators that should start this time duration
                var generators = [];

                // modulo so the positions wrap around the pattern length (in bars)
                var fromPosition = inFromPosition % 1;
                var toPosition = inToPosition % 1;

                var position;
                var positionIntoBuffer;

                position = this._time;
                positionIntoBuffer = null;

                if ( fromPosition < toPosition ) {
                    if ( ( position >= fromPosition ) && ( position < toPosition ) ) {
                        positionIntoBuffer = position - fromPosition;
                    }
                }
                else {
                    if ( ( position >= fromPosition ) && ( position < 1 ) ) {
                        positionIntoBuffer = position - fromPosition;

                    } else if ( ( position >= 0 ) && ( position < toPosition ) ) {
                        positionIntoBuffer = 1 - fromPosition + position;
                    }
                }

                if ( this._loaded && positionIntoBuffer !== null ) {

                    var samplesIntoBuffer = barsToNumSamples( positionIntoBuffer, AudioEngine.getBPM() );
                    generators.push( new AudioExtractor( samplesIntoBuffer, this._buffer, this._gain ) );
                    AudioEngine.dispatch( { time: ( samplesIntoBuffer / 44.1 ), object: this } );
                }

                return generators;
            }
        };

        return AudioEvent;

    }() );


    /**
	 * AudioSequence Composite Class 
	 * 
	 * @param  <> 
	 * @param  <> 
	 *
	 * @return <AudioSequence>  
	 */
    var AudioSequence = function () { // Implements Composite, IAudioEventProcessor

        AudioEventProcessor.call( this );
    };

    extend( AudioSequence, AudioEventProcessor ); // inherit AudioEventProcessor


    /**
	 * AudioSequencer Composite Class 
	 * 
	 * @param  <> 
	 * @param  <> 
	 *
	 * @return <AudioSequencer>  
	 */
    var AudioSequencer = function () { // Implements Composite, IAudioEventProcessor

        AudioEventProcessor.call( this );
        this._currentChildIndex = 0;
    };

    extend( AudioSequencer, AudioEventProcessor ); // inherit AudioEventProcessor

    /**
	 * processEvents() checks for audio events that should start within the duration of the buffer		 		
	 *
	 * @param <Number> inFromPosition : start position (where 1 is one bar)
	 * @param <Number> inToPosition : end position (where 1 is one bar)
	 *
	 * @return IAudioProcessor[] : array with all generators that should start to play within the buffer length
	 */
    AudioSequencer.prototype.processEvents = function ( inFromPosition, inToPosition ) {

        var generators = [];

        // modulo so the positions wrap around the pattern length (in bars)
        var fromPosition = inFromPosition % 1;
        var toPosition = inToPosition % 1;

        if ( toPosition < fromPosition ) {
            this._currentChildIndex = ( this._currentChildIndex + 1 ) % this._children.length;
        }

        if ( this._children[this._currentChildIndex] )
            return generators.concat( this._children[this._currentChildIndex].processEvents( inFromPosition, inToPosition ) );

    };

    /**
	 * webaudiosequencer : Public interface
	 *
	 * @param <> 
	 * @param <>
	 *
	 * @return 
	 */
    var webaudiosequencer = {

        init: function () {

            AudioDriver.init();
        },

        setGainValue: function ( value ) {

            AudioDriver.setGainValue( value );
        },

        getGainValue: function () {

            return AudioDriver.getGainValue();
        },

        setBPM: function ( value ) {

            AudioEngine.setBPM( value );
        },

        addEventGenerator: function ( anEventGenerator ) {

            AudioEngine.addEventGenerator( anEventGenerator );
        },

        removeEventGenerator: function ( anEventGenerator ) {

            AudioEngine.removeEventGenerator( anEventGenerator );
        },

        clearEventGenerator: function () {

            AudioEngine.clearEventGenerator();
        },

        start: function () {

            AudioEngine.start();
        },

        stop: function () {

            AudioEngine.stop();
        },

        isPlaying: function() {

            return AudioEngine.isPlaying()
        },

        listen: function ( callback ) {

            return AudioEngine.listen( callback );
        },

        onReady: function ( callback ) {

            AudioLoader.onLoadComplete( callback );
        },

        setBufferSize: function ( value ) {

            AudioDriver.setBufferSize( value );
        },

        getBufferSize: function () {

            return AudioDriver.getBufferSize();
        },

        AudioEvent: AudioEvent,

        AudioSequence: AudioSequence,

        AudioSequencer: AudioSequencer,

    };

    window.webaudiosequencer = webaudiosequencer;

}() );