module.exports = function(API, params){
  const { OperationType, VariableType, ConnectionState, AllowFlags, Direction, CollisionFlags, CameraFollow, BackgroundType, GamePlayState, BanEntryType, Callback, Utils, Room, Replay, Query, Library, RoomConfig, Plugin, Renderer, Errors, Language, EventFactory, Impl } = API;

  Object.setPrototypeOf(this, Renderer.prototype);
  Renderer.call(this, { // Every renderer should have a unique name.
    name: "PIXI",
    version: "1.0",
    author: "abc & JerryOldson",
    description: `This is the defaultRenderer implemented using the pixi.js renderer which also has webgl/webgpu capabilities.`
  });

  // parameters are exported so that they can be edited outside this class.
  this.defineVariable({
    name: "webGPU",
    description: "Whether to use WebGL or WebGPU",
    type: VariableType.Boolean,
    value: false
  });

  this.defineVariable({
    name: "extrapolation",
    description: "The desired extrapolation value in milliseconds",
    type: VariableType.Integer,
    value: 0,
    range: {
      min: -1000,
      max: 10000,
      step: 5
    }
  });

  this.defineVariable({
    name: "zoomCoeff",
    description: "Zoom Coefficient", 
    type: VariableType.Number,
    value: 1.0,
    range: {
      min: 0,
      max: Infinity,
      step: 0.01
    }
  });

  
  this.defineVariable({
    name: "wheelZoomCoeff",
    description: "Defines how fast you zoom in/out with mouse wheel", 
    type: VariableType.Number,
    value: 1.2,
    range: {
      min: 1,
      max: 10,
      step: 0.01
    }
  });

  this.defineVariable({ // team_colors
    name: "showTeamColors",
    description: "Show team colors?", 
    type: VariableType.Boolean,
    value: true
  });
  
  this.defineVariable({ // show_avatars
    name: "showAvatars",
    description: "Show player avatars?", 
    type: VariableType.Boolean,
    value: true
  });

  this.defineVariable({
    name: "showPlayerIds",
    description: "Show player ids?", 
    type: VariableType.Boolean,
    value: false
  });

  this.defineVariable({
    name: "resolutionScale",
    description: "Resolution Scale",
    type: VariableType.Number,
    value: 1,
    range: {
      min: 0,
      max: Infinity,
      step: 0.01
    }
  });

  this.defineVariable({
    name: "followPlayerId",
    description: "Id of the player that the camera will follow",
    type: VariableType.Integer,
    value: 0
  });

  this.defineVariable({
    name: "restrictCameraOrigin",
    description: "Restrict camera origin to view bounds?", 
    type: VariableType.Boolean,
    value: true
  });

  this.defineVariable({
    name: "followMode",
    description: "Follow camera enabled?", 
    type: VariableType.Boolean,
    value: true
  });

  this.defineVariable({ // show_indicators
    name: "showChatIndicators",
    description: "Show Chat Indicators?", 
    type: VariableType.Boolean,
    value: true
  });

  this.defineVariable({
    name: "drawBackground",
    description: "Draw Background?", 
    type: VariableType.Boolean,
    value: true
  });
    
  this.defineVariable({
    name: "squarePlayers",
    description: "Draw Players as squares?", 
    type: VariableType.Boolean,
    value: false
  });
  
  this.defineVariable({
    name: "currentPlayerDistinction",
    description: "Hide current player's name and draw halo around current player?", 
    type: VariableType.Boolean,
    value: true
  });

  this.defineVariable({
    name: "showInvisibleSegments",
    description: "Show invisible segments?", 
    type: VariableType.Boolean,
    value: false
  });

  this.defineVariable({
    name: "showVertices",
    description: "Show vertices?",
    type: VariableType.Boolean,
    value: false,
  });

  this.defineVariable({
    name: "generalLineWidth",
    description: "The line width of everything except discs and texts on screen.", 
    type: VariableType.Number,
    value: 3,
    range: {
      min: 0,
      max: 100,
      step: 0.01
    }
  });

  this.defineVariable({
    name: "discLineWidth",
    description: "The line width of discs.", 
    type: VariableType.Number,
    value: 4,
    range: {
      min: 0,
      max: 100,
      step: 0.01
    }
  });

  var thisRenderer = this, { Point, Team, TeamColors } = Impl.Core;
  var defaultTeamColors = [new TeamColors(), new TeamColors(), new TeamColors()];
  defaultTeamColors[1].inner.push(15035990);
  defaultTeamColors[2].inner.push(5671397);

  // language-related stuff

  const LanguageData = {
    "GB": [
      "Time is", "Up!", 
      "Red is", "Victorious!", 
      "Red", "Scores!", 
      "Blue is", "Victorious!", 
      "Blue", "Scores!", 
      "Game", "Paused" 
    ],
    "TR": [
      "Süre", "Doldu!", 
      "Kırmızı Takım", "Kazandı!", 
      "Kırmızı Takım", "Gol Attı!", 
      "Mavi Takım", "Kazandı!", 
      "Mavi Takım", "Gol Attı!", 
      "Oyun", "Durduruldu" 
    ],
    "PT": [
      "O tempo", "Acabou!",
      "O vermelho é", "Vitorioso!",
      "O vermelho", "Marca!",
      "O azul é", "Vitorioso!",
      "Pontuações", "Azuis!",
      "Jogo em", "Pausa"
    ],
    "ES": [
      "¡El tiempo ha", "Terminado!",
      "¡El red ha", "Ganado!",
      "¡Punto para el", "Red!",
      "¡El azul ha", "Ganado!",
      "¡Punto para el", "Blue!",
      "Juego en", "Pausa"
    ]
  };

  var scriptElem = null, rendererObj = null, stage = null, stage2 = null, stage3 = null, texture1 = null, texture2 = null, texture3 = null, texture4 = null, customDiscInfo = [], customJointInfo = [], customSegmentInfo = [], customHaloInfo = null, textInfo = {time: 0,queue: []}, locationIndicatorInfo = {}, chatIndicatorInfo = {}, pauseRect = null, lastRenderTime = null, spf = null, scale = thisRenderer.zoomCoeff, origin = {x: 0, y: 0}, gamePaused = false;

  function redrawJoint({ gr, dx, dy, color }){
    gr.moveTo(0, 0);
    gr.lineTo(dx, dy);
    gr.stroke({
      color: color,
      width: thisRenderer.generalLineWidth,
      alignment: 0.5,
    });
  };

  function redrawDisc({gr, disc}){
    gr.clear();
    gr.circle(0, 0, disc.radius);
    gr.setFillStyle(Utils.numberToColor(disc.color));
    gr.fill();
    gr.stroke();
  }

  function redrawPlayerDisc(discInfo, teamColors, disc, player) {
    const gr = discInfo.gr;
    const mask = discInfo.mask;
    gr.clear();
    mask.clear();
    gr.rotation = (3.141592653589793*teamColors.angle)/128;
    var stepWidth = 32/teamColors.inner.length, x=-16;
    for (var i=0; i<teamColors.inner.length; i++){
      gr.setFillStyle(Utils.numberToColor(teamColors.inner[i]));
      gr.rect(x, -16, stepWidth+4, 32);
      gr.fill();
      x+=stepWidth;
    };
    if (thisRenderer.squarePlayers){
      gr.rect(-disc.radius,-disc.radius, 2*disc.radius, 2*disc.radius);
      mask.rect(-disc.radius,-disc.radius, 2*disc.radius, 2*disc.radius);
    }
    else{
      gr.circle(0, 0, disc.radius+1);
      mask.circle(0, 0, disc.radius+1);
    }
    mask.fill({ color: disc.color });
    gr.stroke({
      width: thisRenderer.discLineWidth,
      color: player.isKicking ? 0xffffff : 0x000000
    });
  };

  function redrawHalo(){
    const grHalo = customHaloInfo.gr;
    grHalo.clear();
    if (thisRenderer.squarePlayers)
      grHalo.rect(-25, -25, 50, 50);
    else
      grHalo.circle(0, 0, 25);
    grHalo.stroke({
      color: 0xffffff,
      width: thisRenderer.generalLineWidth,
      alignment: 0.5,
      alpha: 0.3,
    });
  }

  function calculateLocationIndicatorValues(pos, viewWidth, viewHeight){
    viewWidth = 0.5*viewWidth-25;
    viewHeight = 0.5*viewHeight-25;
    var deltaX = pos.x-origin.x;
    var deltaY = pos.y-origin.y;
    var x = origin.x+((deltaX>viewWidth) ? viewWidth : ((deltaX<-viewWidth) ? -viewWidth : deltaX));
    var y = origin.y+((deltaY>viewHeight) ? viewHeight : ((deltaY<-viewHeight) ? -viewHeight : deltaY));
    deltaX = pos.x-x;
    deltaY = pos.y-y;
    return (deltaX*deltaX+deltaY*deltaY<=900) ? null : { x, y, angle: Math.atan2(deltaY, deltaX) };
  }

  function regenerateNecessaryObjects({FillGradient, Matrix, Container, Graphics, Text, Sprite}, {players, gameState}){
    if (!gameState)
      return;
    var {physicsState, stadium} = gameState;
    customDiscInfo = [];
    customJointInfo = [];
    customSegmentInfo = [];
    locationIndicatorInfo = {};
    chatIndicatorInfo = {};
    stage = new Container();
    stage.x = params.canvas.width/2;
    stage.y = params.canvas.height/2;
    stage2 = new Container();
    stage2.scale.set(scale, scale);
    stage2.x = -origin.x;
    stage2.y = -origin.y;
    stage.addChild(stage2);
    stage3 = new Container();
    stage3.x = -origin.x;
    stage3.y = -origin.y;
    const nameContainer = new Container();
    const playerContainer = new Container();
    const haloContainer = new Container();
    function initHalo(){
      const gr = new Graphics();
      if (thisRenderer.squarePlayers)
        gr.rect(-25, -25, 50, 50)
      else gr.circle(0, 0, 25);
      gr.stroke({
        color: 0xffffff,
        width: thisRenderer.generalLineWidth,
        alignment: 0.5,
        alpha: 0.3,
      });
      haloContainer.addChild(gr);
      stage2.addChild(haloContainer);
      customHaloInfo = {gr, haloContainer};
    }
    function initBackground(){
      const { bgType, bgWidth, bgHeight, bgColor, bgCornerRadius, bgKickOffRadius, bgGoalLine } = stadium, gr = new Graphics();
      rendererObj.background.color = bgColor;
      if (bgType==1){
        gr.x = -bgWidth;
        gr.y = -bgHeight;
        gr.roundRect(0, 0, 2*bgWidth, 2*bgHeight, bgCornerRadius);
        gr.fill({
          texture: texture1,
          matrix: new Matrix().scale(2, 2),
        });
        gr.stroke({
          color: 0xc7e6bd,
          width: thisRenderer.generalLineWidth,
          alignment: 0.5,
        });
        gr.moveTo(bgWidth, 0);
        gr.lineTo(bgWidth, 2*bgHeight);
        gr.stroke({
          color: 0xc7e6bd,
          width: thisRenderer.generalLineWidth,
          alignment: 0.5,
        });
        gr.beginPath();
        gr.arc(bgWidth, bgHeight, bgKickOffRadius, 0, 2*Math.PI);
        gr.stroke({
          color: 0xc7e6bd,
          width: thisRenderer.generalLineWidth,
          alignment: 0.5,
        });
      }
      else if (bgType==2){
        const gradientFill = new FillGradient(0, 0, 0, 2*bgHeight), h = Math.floor((bgHeight*2)/15);
        for (var i=0; i<=2*h; i++)
          gradientFill.addColorStop((i+1-((i+1)%2))/(2*h), i%4<2 ? 0x6d6d6d : 0xe9cc6e);
        gr.x = -10000
        gr.y = -10000
        gr.rect(0, 0, 20000, 20000);
        gr.fill({
          texture: texture3,
          matrix: new Matrix().scale(2, 2),
        });
        const gr2 = new Graphics();
        gr2.x = 10000-bgWidth;
        gr2.y = 10000-bgHeight;
        gr2.roundRect(0, 0, 2*bgWidth, 2*bgHeight, bgCornerRadius);
        gr2.fill({
          texture: texture2,
          matrix: new Matrix().scale(2, 2),
        });
        gr2.stroke({
          color: 0xe9cc6e,
          width: thisRenderer.generalLineWidth,
          alignment: 0.5,
        });

        //gr2.lineStyle(1,0xe9cc6e,1);
        gr2.moveTo(bgWidth, 8);
        gr2.lineTo(bgWidth, 2*bgHeight); // gr2.dashLineTo(bgWidth, 2*bgHeight, 15, 15);
        gr2.stroke({
          //color: 0xe9cc6e,
          fill: gradientFill,
          width: thisRenderer.generalLineWidth, // maybe 2
          alignment: 0.5,
        });
        var delta = bgWidth-bgGoalLine;
        if (bgGoalLine<bgCornerRadius)
          delta=0;
        var drawKickOff = function(color, x, ccw){
          gr2.beginPath();
          gr2.arc(bgWidth, bgHeight, bgKickOffRadius, -Math.PI/2, Math.PI/2, ccw);
          if (x!=0){
            gr2.moveTo(x+bgWidth, 0);
            gr2.lineTo(x+bgWidth, 2*bgHeight);
          }
          gr2.stroke({
            color: color,
            width: thisRenderer.generalLineWidth,
            alignment: 0.5,
          });
        };
        drawKickOff("#85ACF3", delta, false);
        drawKickOff("#E18977", -delta, true);
        gr.addChild(gr2);
      }
      stage2.addChild(gr);
    }
    function initVertex(vertexObj){
      const gr = new Graphics();
      gr.stroke({
        color: 0x000000,
        width: thisRenderer.generalLineWidth,
        alignment: 0.5,
      });
      gr.beginFill(0xff44ff);
      gr.circle(0, 0, 4);
      gr.endFill();
      gr.x = vertexObj.pos.x;
      gr.y = vertexObj.pos.y;
      stage2.addChild(gr);
    }
    function initSegment(segmentObj, id){
      if (!segmentObj.vis && !thisRenderer.showInvisibleSegments) return;
      const { x: x0, y: y0 } = physicsState.vertices[segmentObj.v0.id].pos;
      const { x: x1, y: y1 } = physicsState.vertices[segmentObj.v1.id].pos;
      const gr = new Graphics();
      if (!segmentObj.arcCenter){
        gr.moveTo(0, 0);
        gr.lineTo(x1-x0, y1-y0);
        gr.stroke({
          color: segmentObj.color,
          width: thisRenderer.generalLineWidth,
          alignment: 0.5,
        });
        gr.x = x0;
        gr.y = y0;
      }
      else{
        var { x: cx, y: cy } = segmentObj.arcCenter;
        gr.arc(0, 0, segmentObj.arcRadius, Math.atan2(y0-cy, x0-cx), Math.atan2(y1-cy, x1-cx));
        gr.stroke({
          color: segmentObj.color,
          width: thisRenderer.generalLineWidth,
          alignment: 0.5,
        });
        gr.x = cx;
        gr.y = cy;
      }
      stage2.addChild(gr);
      customSegmentInfo[id] = {gr, cache:null};
    }
    function initDisc(discObj, id){
      const gr = new Graphics();
      if (thisRenderer.squarePlayers)
        gr.rect(-discObj.radius, -discObj.radius, 2*discObj.radius, 2*discObj.radius);
      else
        gr.circle(0, 0, discObj.radius+10);
      gr.fill({ color: Utils.numberToColor(discObj.color) });
      gr.stroke({
        color: 0x000000,
        width: thisRenderer.discLineWidth-2,
        alignment: 0.5,
      });
      stage2.addChild(gr);
      let gr2 = null;
      let avatarText = null;
      let playerNameText = null;
      let playerNameMask = null;
      if (discObj.playerId!==null && discObj.playerId!==undefined){
        gr2 = new Graphics();
        if (thisRenderer.squarePlayers)
          gr2.rect(-discObj.radius, -discObj.radius, 2*discObj.radius, 2*discObj.radius);
        else
          gr2.circle(0, 0, discObj.radius+11);
        gr2.fill({ color: Utils.numberToColor(discObj.color) });
        gr.mask = gr2;
        avatarText = new Text({
          text: "",
          style: {
            fontFamily: ["Arial Black", "Arial Bold", "Gadget", "sans-serif"],
            fontSize: 16,
            align: "center",
            fill: "#000000",
            fontWeight: "900"
          }
        });
        avatarText.resolution = 2;
        avatarText.anchor.set(0.5);
        const player = thisRenderer.room.getPlayer(discObj.playerId);
        playerNameText = new Text({
          text: player.name,
          style: {
            fontFamily: ["sans-serif"],
            fontSize: 12,
            fill: "#ffffff",
            fontWeight: "100",
          }
        });
        playerNameText.resolution = 2;
        if (2*playerNameText.width>160){
          playerNameMask = new Graphics();
          playerNameMask.rect(0, 0, 73, 16);
          playerNameMask.fill(0x000000);
          playerNameMask.alpha = 0.5;
          playerNameText.anchor.set(0, 0.5);
          playerNameText.pivot.set(34, -discObj.radius*1.65);
          playerNameMask.pivot.set(34, -discObj.radius*1.65+4);
          stage2.addChild(playerNameMask);
          playerNameText.mask = playerNameMask;
        }
        else{
          playerNameText.anchor.set(0.5);
          playerNameText.pivot.set(0, -discObj.radius*1.65);
        }
        stage2.removeChild(gr);
        playerContainer.addChild(gr);
        nameContainer.addChild(playerNameText);
        playerContainer.addChild(gr2);
        playerContainer.addChild(avatarText);
      }
      customDiscInfo[id] = { gr, avatarText, playerNameText, mask: gr2, cache: null, teamCache: null, playerNameMask };
    }
    function initJoint(jointObj, id){
      if (jointObj.color==-1)
        return;
      const { x: x0, y: y0 } = physicsState.discs[jointObj.d0].pos;
      const { x: x1, y: y1 } = physicsState.discs[jointObj.d1].pos;
      const gr = new Graphics();
      var info = customJointInfo[id] = {
        dx: x1-x0,
        dy: y1-y0,
        gr,
        color: jointObj.color,
      };
      redrawJoint(info);
      gr.x = x0;
      gr.y = y0;
      stage2.addChild(gr);
    }

    function Animator(values){ // Ib
      this.values = values.slice(); // Yb
    }
    Animator.prototype = {
      eval: function(x){
        var idx = this.values.length-1;
        if (x<=this.values[0])
          return this.values[1];
        if (x>=this.values[idx])
          return this.values[idx-2];
        var min = 0, max = (max/5)|0;
        do {
          var cur = (max+min)>>>1;
          if (x>this.values[5*cur])
            min = cur+1;
          else
            max = cur-1;
        } while (min<=max);
        var idx2 = 5*max, idx3 = this.values[idx2];
        var X = (x-idx3)/(this.values[idx2+5]-idx3), sqrX = X*X, cubeX = sqrX*X;
        return (2*cubeX-3*sqrX+1)*this.values[idx2+1]+(cubeX-2*sqrX+X)*this.values[idx2+2]+(-2*cubeX+3*sqrX)*this.values[idx2+3]+(cubeX-sqrX)*this.values[idx2+4];
      }
    }
    function CanvasText(lines, color){ // R
      var arr = [];
      for (var i=0;i<lines.length;i++){
        var line = new Graphics();
        var text1 = new Text({
          text: lines[i],
          style: {
            fontFamily: ["Arial Black", "Arial Bold", "Gadget", "sans-serif"],
            fontSize: 70,
            align: "center",
            fill: "#000000",
            fontWeight: "bold"
          }
        });
        text1.anchor.set(0.5);
        text1.x=7;
        text1.y=7;
        line.addChild(text1);
        var text2 = new Text({
          text: lines[i],
          style: {
            fontFamily: ["Arial Black", "Arial Bold", "Gadget", "sans-serif"],
            fontSize: 70,
            align: "center",
            fill: Utils.numberToColor(color),
            fontWeight: "bold"
          }
        });
        text2.anchor.set(0.5);
        text2.x=0;
        text2.y=0;
        line.addChild(text2);
        arr.push(line);
      }
      this.arr = arr; // We
    }
    CanvasText.alphaAnimator = new Animator([0, 0, 2, 1, 0, 0.35, 1, 0, 1, 0, 0.7, 1, 0, 0, 0, 1]); // jn
    CanvasText.coordAnimator = new Animator([0, -1, 3, 0, 0, 0.35, 0, 0, 0, 0, 0.65, 0, 0, 1, 3, 1]); // kn
    CanvasText.prototype = {
      calculateTime: function(){ // zo
        return 2.31+0.1155*(this.arr.length-1);
      },
      updateInStage: function(coeff){
        var coeff1 = coeff / 2.31;
        this.arr.forEach((x, i)=>{
          var coeff2 = coeff1-0.05*i, width = ((0!=(i&1)) ? -1 : 1)*180*CanvasText.coordAnimator.eval(coeff2);
          x.alpha = CanvasText.alphaAnimator.eval(coeff2);
          x.x = origin.x+ width//*-0.5*canvas.width*/;
          x.y = origin.y + 35*(1-this.arr.length)+70*i/*-0.5*canvas.height*/;
          stage3.addChild(x);
        });
      },
      renderStatic: function() {
        this.arr.forEach((x,i)=>{
          x.x= origin.x + 0;/*-0.5 * canvas.width*/
          x.y= origin.y + 35 * (1 - this.arr.length) + 70 * i;/*- 0.5 * canvas.height*/
          stage3.addChild(x);
        })
      },
      removeFromStage: function(){
        this.arr.forEach((x)=>{
          stage3.removeChild(x);
        });
      }
    }
    function initTexts(){
      const TextMap = LanguageData[Language.current?.abbr||"GB"];
      textInfo = {
        time: 0, // xc
        queue: [], // ab
        timeUp: new CanvasText([TextMap[0], TextMap[1]], 16777215), // Ar // ["Time is", "Up!"]
        redVictory: new CanvasText([TextMap[2], TextMap[3]], 15035990), // Gq // ["Red is", "Victorious!"]
        redScore: new CanvasText([TextMap[4], TextMap[5]], 15035990), // Fq // ["Red", "Scores!"]
        blueVictory: new CanvasText([TextMap[6], TextMap[7]], 625603), // Cn // ["Blue is", "Victorious!"]
        blueScore: new CanvasText([TextMap[8], TextMap[9]], 625603), // Bn // ["Blue", "Scores!"]
        gamePause: new CanvasText([TextMap[10], TextMap[11]], 16777215) // eq // ["Game", "Paused"]
      };
    }
    function initPauseRect(){
      const gr = new Graphics();
      gr.x=0;
      gr.y=0;
      pauseRect = gr;
      stage3.addChild(gr);
    }
    function initLocationIndicator(id, pos, color, viewWidth, viewHeight){ // nk
      var vals = calculateLocationIndicatorValues(pos, viewWidth, viewHeight);
      const gr = new Graphics();
      const gr1 = new Graphics();
      gr1.x = 2;
      gr1.y = 2;
      gr1.moveTo(15, 0);
      gr1.lineTo(0, 7);
      gr1.lineTo(0, -7);
      gr1.closePath();
      gr1.fill({
        color: "rgba(0,0,0,0.5)"
      });
      gr.addChild(gr1);
      const gr2 = new Graphics();
      gr2.x = -2;
      gr2.y = -2;
      gr2.moveTo(15, 0);
      gr2.lineTo(0, 7);
      gr2.lineTo(0, -7);
      gr2.closePath();
      gr2.fill({
        color: Utils.numberToColor(color)
      });
      gr.addChild(gr2);
      if (vals){
        gr.x = vals.x;
        gr.y = vals.y;
        gr.rotation = vals.angle;
        stage2.addChild(gr);
      }
      locationIndicatorInfo[id] = gr;
    }
    function initLocationIndicators(){ // Lq
      var ballDisc = physicsState.discs[0];
      var viewWidth = 0;
      var viewHeight = 0;
      initLocationIndicator("ball", ballDisc.pos, ballDisc.color, viewWidth, viewHeight);
      players.forEach((player)=>(player.disc && initLocationIndicator(player.id, player.disc.pos, player.team.color, viewWidth, viewHeight)));
    }
    function initChatIndicators(){
      players.forEach((player)=>{
        var gr = new Sprite(texture4);
        gr.anchor.set(0.5);
        chatIndicatorInfo[player.id] = {
          gr,
          active: false,
        };
        //stage2.addChild(gr);
      });
    };
    thisRenderer.drawBackground && initBackground();
    thisRenderer.showVertices && physicsState.vertices.forEach(initVertex);
    physicsState.segments.forEach(initSegment);
    initHalo();
    stage2.addChild(nameContainer);
    stage2.addChild(playerContainer);
    physicsState.discs.forEach(initDisc);
    physicsState.joints.forEach(initJoint);
    initPauseRect();
    initChatIndicators();
    initTexts();
    initLocationIndicators();
    stage.addChild(stage3);
    lastRenderTime = window.performance.now();
  }

  function _regenerateNecessaryObjects(){
    thisRenderer.room && (typeof PIXI!="undefined") && regenerateNecessaryObjects(PIXI, thisRenderer.room);
  }

  function updateLocationIndicators(roomState, viewWidth, viewHeight){
    function updateLocationIndicator(id, disc){
      var gr = locationIndicatorInfo[id];
      if (!gr)
        return;
      var vals = disc && calculateLocationIndicatorValues(disc.pos, viewWidth, viewHeight);
      if (vals){
        gr.x = vals.x;
        gr.y = vals.y;
        gr.rotation = vals.angle;
        stage2.addChild(gr);
      }
      else
        stage2.removeChild(gr);
    }
    updateLocationIndicator("ball", roomState.gameState.physicsState.discs[0]);
    roomState.players.forEach((player)=>updateLocationIndicator(player.id, player.disc));
  }

  function addText(textObj){
    textInfo.queue.push(textObj);
  }

  function resetTexts(){
    textInfo.queue = [];
    textInfo.time = 0;
  }

  function updateText(deltaTime){
    if (!textInfo)
      return;
    var {queue} = textInfo;
    if (queue.length==0)
      return;
    textInfo.time += deltaTime;
    if (textInfo.time<=queue[0].calculateTime())
      return;
    textInfo.time = 0;
    queue[0].removeFromStage();
    queue.shift();
  }

  function renderText(){
    if (textInfo.queue.length==0)
      return;
    textInfo.queue[0].updateInStage(textInfo.time);
  }
  
  function updateCameraOrigin(gameState, followDisc, viewWidth, viewHeight, deltaTime){
    var stadium = gameState.stadium;
    if (thisRenderer.followMode){
      var x, y, pos;
      if (followDisc && stadium.cameraFollow==1){
        pos = followDisc.pos; // player's position
        x = pos.x;
        y = pos.y;
      }
      else{
        pos = gameState.physicsState.discs[0].pos; // ball's position
        x = pos.x;
        y = pos.y;
        if (followDisc){
          var playerPos = followDisc.pos;
          x = 0.5*(x+playerPos.x);
          y = 0.5*(y+playerPos.y);
          var w = 0.5*viewWidth;
          var h = 0.5*viewHeight;
          var minX = playerPos.x-w+50;
          var minY = playerPos.y-h+50;
          var maxX = playerPos.x+w-50;
          var maxY = playerPos.y+h-50;
          x = x > maxX ? maxX : x < minX ? minX : x;
          y = y > maxY ? maxY : y < minY ? minY : y;
        }
      }
      var t = 60*deltaTime;
      if (t>1)
        t = 1;
      t *= 0.04;
      var x0 = origin.x;
      var y0 = origin.y;
      origin.x = x0+(x-x0)*t;
      origin.y = y0+(y-y0)*t;
    }
    if (thisRenderer.restrictCameraOrigin){
      if (viewWidth>2*stadium.width)
        origin.x = 0;
      else if (origin.x+0.5*viewWidth>stadium.width)
        origin.x = stadium.width-0.5*viewWidth;
      else if (origin.x-0.5*viewWidth<-stadium.width)
        origin.x = -stadium.width+0.5*viewWidth;
      if (viewHeight>2*stadium.height)
        origin.y = 0;
      else if (origin.y+0.5*viewHeight>stadium.height)
        origin.y = stadium.height-0.5*viewHeight;
      else if (origin.y-0.5*viewHeight<-stadium.height)
        origin.y = -stadium.height+0.5*viewHeight;
    }
    // fix all possible camera bugs
    if (origin.x*0!=0)
      origin.x = 0;
    if (origin.y*0!=0)
      origin.y = 0;
    stage2.x = -origin.x*thisRenderer.zoomCoeff;
    stage2.y = -origin.y*thisRenderer.zoomCoeff;
    stage3.x = -origin.x;
    stage3.y = -origin.y;
  }

  function update(roomState, viewWidth, viewHeight){
    const { discs, joints, segments } = roomState.gameState.physicsState;
    if (!customDiscInfo)
      return;
    updateLocationIndicators(roomState, viewWidth, viewHeight);
    updateGamePaused(roomState.gameState);
    segments.forEach((segment, id)=>{
      if (!segment.vis)
        return;
      const segInfo = customSegmentInfo[id];
      const gr = segInfo.gr;
      var pos1 = segment.v0.pos, pos2 = segment.v1.pos;
      if (0*segment.curveF!=0){
        var dx = pos2.x-pos1.x, dy = pos2.y-pos1.y;
        if (dx!=gr.dx || dy!=gr.dy){
          gr.dx = dx;
          gr.dy = dy;
          gr.clear();
          gr.moveTo(0, 0);
          gr.lineTo(dx, dy);
          gr.stroke({
            color: segment.color,
            width: thisRenderer.generalLineWidth,
            alignment: 0.5,
          });
        }
        gr.x = pos1.x;
        gr.y = pos1.y;
      }
      else{
        var center = segment.arcCenter;
        var deltaX = pos1.x-center.x, deltaY = pos1.y-center.y;
        if (!segInfo.cache || segInfo.cache.deltaX!== deltaX || segInfo.cache.deltaY!==deltaY) {
          gr.clear();
          gr.arc(0, 0, Math.sqrt(deltaX*deltaX+deltaY*deltaY), Math.atan2(deltaY, deltaX), Math.atan2(pos2.y-center.y, pos2.x-center.x));
          gr.stroke({
            color: segment.color,
            width: thisRenderer.generalLineWidth,
            alignment: 0.5,
          });
          segInfo.cache = {deltaX, deltaY};
        }
        gr.x = center.x;
        gr.y = center.y;
      }
    });

    discs.forEach((disc, id)=>{
      const { pos } = disc, discInfo = customDiscInfo[id];
      if (!discInfo)
        return;
      const gr = discInfo.gr;
      gr.x = pos.x;
      gr.y = pos.y;
      if (disc.playerId!==null && disc.playerId!==undefined){
        const player = roomState.getPlayer(disc.playerId);
        discInfo.mask.x = pos.x;
        discInfo.mask.y = pos.y;
        var teamColors = thisRenderer.showTeamColors ? roomState.teamColors[player.team.id] : defaultTeamColors[player.team.id];
        if (thisRenderer.showAvatars){
          discInfo.avatarText.text = player.avatar||player.avatarNumber;
          discInfo.avatarText.style.fill = teamColors.text;
          discInfo.avatarText.x = pos.x;
          discInfo.avatarText.y = pos.y;
        }
        else
          discInfo.avatarText.text = player.avatarNumber;
        if (!thisRenderer.currentPlayerDistinction || player.id!==thisRenderer.followPlayerId){
          thisRenderer.showPlayerIds ? discInfo.playerNameText.text = `[${player.id}] ${player.name}` : discInfo.playerNameText.text = player.name;
          discInfo.playerNameText.x = pos.x;
          discInfo.playerNameText.y = pos.y;
          if (discInfo.playerNameMask){
            discInfo.playerNameMask.x = pos.x;
            discInfo.playerNameMask.y = pos.y;
          }
        }
        else
          discInfo.playerNameText.text = "";
        var chatIndicator = chatIndicatorInfo[player.id];
        if (chatIndicator.active && thisRenderer.showChatIndicators){
          chatIndicator.gr.x = disc.pos.x;
          chatIndicator.gr.y = disc.pos.y-25;
          stage2.addChild(chatIndicator.gr);
        }
        else
          stage2.removeChild(chatIndicator.gr);
        if (!discInfo.teamCache || discInfo.teamCache.teamId !== player.team.id || discInfo.teamCache.isKicking !== player.isKicking || discInfo.teamCache.colors !== teamColors.inner){
          redrawPlayerDisc(discInfo, teamColors, disc, player);
          discInfo.teamCache = {
            teamId: player.team.id,
            isKicking: player.isKicking,
            colors: teamColors.inner
          };
        }
      }
      else if (!discInfo.cache || discInfo.cache.color !== disc.color || discInfo.cache.radius !== disc.radius){
        redrawDisc({gr, disc});
        discInfo.cache = { color: disc.color, radius: disc.radius };
      }
    });
    joints.forEach((joint, id)=>{
      const jointInfo = customJointInfo[id];
      if (!jointInfo)
        return;
      const { gr, dx, dy } = jointInfo;
      const { x: x0, y: y0 } = discs[joint.d0].pos;
      const { x: x1, y: y1 } = discs[joint.d1].pos;
      var _dx = x1-x0, _dy = y1-y0;
      if (_dx!=dx || _dy!=dy){
        jointInfo.dx = _dx;
        jointInfo.dy = _dy;
        gr.clear();
        redrawJoint(jointInfo);
      }
      gr.x = x0;
      gr.y = y0;
    });
    updateHalo(roomState);
  }

  function updateGamePaused(gameState) { // Oq
    var paused = gameState.pauseGameTickCounter>0;
    setGamePaused(paused);
    if (!paused)
      return;
    pauseRect.clear();
    if (gameState.pauseGameTickCounter!=120){
      var width = (gameState.pauseGameTickCounter/120)*200;
      pauseRect.rect(origin.x+-0.5*width,origin.y+ 100, width, 20);
      pauseRect.setFillStyle("white");
      pauseRect.fill();
    }
    textInfo.gamePause.renderStatic();
  }

  function setGamePaused(pauseState) { // lr
    if (pauseState==gamePaused)
      return;
    if (!pauseState) {
      textInfo.gamePause.removeFromStage();
      pauseRect.clear();
    }
    params.canvas.style.filter = pauseState ? "grayscale(70%)" : "";
    gamePaused = pauseState;
  }

  function resizeCanvas(){
    var { canvas } = params;
    if (!canvas.parentElement)
      return;
    var coeff = window.devicePixelRatio*thisRenderer.resolutionScale, rect = canvas.getBoundingClientRect();
    var w = Math.round(coeff*rect.width), h = Math.round(coeff*rect.height);
    if (canvas.width!=w || canvas.height!=h){
      canvas.width = w;
      canvas.height = h;
      rendererObj.resize(w, h);
      stage.x = w/2;
      stage.y = h/2;
    }
  };

  function updateHalo(roomState){
    var pos = roomState.getPlayer(thisRenderer.followPlayerId)?.disc?.pos;
    if (thisRenderer.currentPlayerDistinction && pos){
      customHaloInfo.gr.x = pos.x;
      customHaloInfo.gr.y = pos.y;
      customHaloInfo.haloContainer.addChild(customHaloInfo.gr);
      return;
    }
    customHaloInfo.haloContainer.removeChild(customHaloInfo.gr);
  };

  this.initialize = function(){
    function loadScript(src, onload){
      var e = document.createElement("script");
      e.onload = onload;
      e.src = src;
      document.body.appendChild(e);
      return e;
    }
    scriptElem = loadScript("https://cdnjs.cloudflare.com/ajax/libs/pixi.js/8.6.6/pixi.min.js", ()=>{
      rendererObj = thisRenderer.webGPU ? new PIXI.WebGPURenderer() : new PIXI.WebGLRenderer();
      texture1 = PIXI.Texture.from(params.images?.grass);
      texture2 = PIXI.Texture.from(params.images?.concrete);
      texture3 = PIXI.Texture.from(params.images?.concrete2);
      texture4 = PIXI.Texture.from(params.images?.typing);
      thisRenderer.followPlayerId = thisRenderer.room?.currentPlayerId;
      rendererObj.init({
        view: params.canvas,
        antialias: true,
        resolution: thisRenderer.resolutionScale,
        backgroundColor: "#1099bb",
        forceFXAA: true,
        legacy: false,
        powerPreference: "high-performance", // "high-performance", "low-power"
      }).then(_regenerateNecessaryObjects);
    });
  };

  this.finalize = function(){
    stage?.destroy({children: true, texture: true, textureSource: true});
    rendererObj?.destroy({ removeView: false });
    scriptElem && document.body.removeChild(scriptElem);
    scriptElem = null;
    rendererObj = null;
    stage = null;
    stage2 = null;
    stage3 = null;
    texture1 = null;
    texture2 = null;
    texture3 = null;
    texture4 = null;
    customDiscInfo = null;
    customJointInfo = null;
    customSegmentInfo = null;
    customHaloInfo = null;
    textInfo = null;
    locationIndicatorInfo = null;
    chatIndicatorInfo = null;
  };

  this.render = function(){ // render logic here. called inside requestAnimationFrame callback
    if (!stage || !stage2 || !stage3)
      return;
    var extrapolatedRoomState = thisRenderer.room.extrapolate(thisRenderer.extrapolation, true);
    if (!params.paintGame || !extrapolatedRoomState.gameState || !rendererObj)
      return;
    var time = window.performance.now();
    spf = (time-lastRenderTime)/1000;
    var followPlayer = extrapolatedRoomState.getPlayer(thisRenderer.followPlayerId), followDisc = followPlayer?.disc;
    var zoomCoeff = thisRenderer.zoomCoeff*window.devicePixelRatio*thisRenderer.resolutionScale;
    var maxViewWidth = extrapolatedRoomState.gameState.stadium.maxViewWidth, viewWidth = params.canvas.width/zoomCoeff;
    if (maxViewWidth>0 && maxViewWidth<viewWidth){
      viewWidth = maxViewWidth;
      zoomCoeff = params.canvas.width/maxViewWidth;
    }
    var viewHeight = params.canvas.height/zoomCoeff;
    lastRenderTime = time;
    updateCameraOrigin(extrapolatedRoomState.gameState, followDisc, viewWidth, viewHeight, spf);
    //this.ctx.scale(zoomCoeff, zoomCoeff);
    resizeCanvas();
    update(extrapolatedRoomState, viewWidth, viewHeight);
    if (extrapolatedRoomState.gameState.pauseGameTickCounter<=0){
      updateText(spf);
      renderText();
    }
    rendererObj.render(stage);
    params.onRequestAnimationFrame?.(extrapolatedRoomState);
  };

  this.fps = function(){
    return 1/spf;
  };

  // you can keep track of changes using these callbacks, and apply them in your render logic:

  this.onPlayerChatIndicatorChange = function(id, value, customData){ // wl (a, b)
    chatIndicatorInfo[id] && (chatIndicatorInfo[id].active = value);
  };

  this.onPlayerJoin = function(playerObj, customData){
    _regenerateNecessaryObjects();
  };

  this.onPlayerLeave = function(playerObj, reason, isBanned, byId, customData){
    _regenerateNecessaryObjects();
  };

  this.onPlayerTeamChange = function(id, teamId, byId, customData){
    _regenerateNecessaryObjects();
  };

  this.onVariableValueChange = function(addonObject, variableName, oldValue, newValue){
    if (addonObject!=thisRenderer)
      return;
    switch(variableName){
      case "squarePlayers":
        redrawHalo();
        const discs = thisRenderer.room.state.gameState.physicsState.discs;
        for (let i=0;i<discs.length;i++){
          if (discs[i].playerId!==null && discs[i].playerId!==undefined){
            const playerObj = thisRenderer.room.getPlayer(discs[i].playerId);
            const discInfo = customDiscInfo[i];
            var teamColors = thisRenderer.showTeamColors ? thisRenderer.room.state.teamColors[playerObj.team.id] : defaultTeamColors[playerObj.team.id];
            redrawPlayerDisc(discInfo, teamColors, playerObj.disc, playerObj);
          }
        }
        break;
      case "drawBackground":
      case "showInvisibleSegments":
      case "showVertices":
      case "generalLineWidth":
      case "discLineWidth":
        _regenerateNecessaryObjects();
        break;
    }
  };

  this.onTeamGoal = function(teamId, goalId, goal, ballDiscId, ballDisc, customData){ // Ni (a)
    addText((teamId==Team.red.id) ? textInfo.redScore : textInfo.blueScore);
  };

  this.onGameStart = function(byId, customData){ // Ki (a)
    _regenerateNecessaryObjects();
    resetTexts();
  };

  this.onGameEnd = function(winningTeamId, customData){ // Oi (a)
    addText((winningTeamId==Team.red.id) ? textInfo.redVictory : textInfo.blueVictory);
  };

  this.onGameStop = function(winningTeamId, customData){
    stage?.destroy();
    stage = null;
    customDiscInfo = null;
    customJointInfo = null;
  };

  this.onTimeIsUp = function(customData){ // Pi ()
    addText(textInfo.timeUp);
  };

  this.zoomIn = function(pixelCoordX, pixelCoordY, zoomCoeff){
    var k = (1-1/zoomCoeff)/scale;
    origin.x += k*(pixelCoordX-params.canvas.width/2);
    origin.y += k*(pixelCoordY-params.canvas.height/2);
    scale *= zoomCoeff;
    thisRenderer.zoomCoeff = scale;
    _regenerateNecessaryObjects();
  };

  this.zoomOut = function(pixelCoordX, pixelCoordY, zoomCoeff){
    var k = (1-zoomCoeff)/scale;
    origin.x += k*(pixelCoordX-params.canvas.width/2);
    origin.y += k*(pixelCoordY-params.canvas.height/2);
    scale /= zoomCoeff;
    thisRenderer.zoomCoeff = scale;
    _regenerateNecessaryObjects();
  };

  this.onWheel = function(event){
    if (event.deltaY<0)
      thisRenderer.zoomIn(event.offsetX, event.offsetY, thisRenderer.wheelZoomCoeff);
    else
      thisRenderer.zoomOut(event.offsetX, event.offsetY, thisRenderer.wheelZoomCoeff);
  };

  this.onLanguageChange = function(abbr, customData){
    _regenerateNecessaryObjects();
  };

  this.onKeyDown = function(e){
    switch(e.keyCode){
      case 107:{ // Numpad '+' key
        thisRenderer.zoomCoeff += 0.1;
        scale += 0.1;
        _regenerateNecessaryObjects();
        break;
      }
      case 109:{ // Numpad '-' key
        thisRenderer.zoomCoeff -= 0.1;
        if (thisRenderer.zoomCoeff<=0){
          thisRenderer.zoomCoeff = 0.01;
          scale = 0.01;
        }
        else
          scale -= 0.1;
        break;
      }
    }
  };

  this.transformPixelCoordToMapCoord = (x, y)=>({
    x: (x-params.canvas.width/2)/scale+origin.x, 
    y: (y-params.canvas.height/2)/scale+origin.y
  });
  this.transformMapCoordToPixelCoord = (x, y)=>({
    x: scale*(x-origin.x)+params.canvas.width/2, 
    y: scale*(y-origin.y)+params.canvas.height/2
  });
  this.transformPixelDistanceToMapDistance = (dist)=>dist/scale;
  this.transformMapDistanceToPixelDistance = (dist)=>dist*scale;
  this.getOrigin = ()=>origin;
  this.getActualZoomCoefficient = ()=>scale;
  this.setOrigin = (_origin)=>{
    origin.x = _origin.x;
    origin.y = _origin.y;
  };

  // snapshot support

  this.takeSnapshot = function(){
    var { webGPU, extrapolation, zoomCoeff, wheelZoomCoeff, showTeamColors, showAvatars, showPlayerIds, resolutionScale, followPlayerId, restrictCameraOrigin, followMode, showChatIndicators, drawBackground, squarePlayers, currentPlayerDistinction, showInvisibleSegments, showVertices, generalLineWidth, discLineWidth } = thisRenderer;
    return {
      webGPU, 
      extrapolation, 
      showTeamColors, 
      showAvatars, 
      showPlayerIds, 
      zoomCoeff, 
      wheelZoomCoeff, 
      resolutionScale, 
      showChatIndicators, 
      restrictCameraOrigin, 
      followMode, 
      followPlayerId, 
      drawBackground, 
      squarePlayers, 
      currentPlayerDistinction, 
      showInvisibleSegments, 
      showVertices, 
      generalLineWidth, 
      discLineWidth,
      /*
      customDiscInfo: JSON.parse(JSON.stringify(customDiscInfo)), 
      customJointInfo: JSON.parse(JSON.stringify(customJointInfo)), 
      customSegmentInfo: JSON.parse(JSON.stringify(customSegmentInfo)), 
      customHaloInfo: JSON.parse(JSON.stringify(customHaloInfo)), 
      textInfo: JSON.parse(JSON.stringify(textInfo)), 
      locationIndicatorInfo: JSON.parse(JSON.stringify(locationIndicatorInfo)), 
      chatIndicatorInfo: JSON.parse(JSON.stringify(chatIndicatorInfo)), 
      */
      scale,
      origin: JSON.parse(JSON.stringify(origin)), 
      gamePaused
    };
  };

  this.useSnapshot = function(snapshot){
    var { webGPU, extrapolation, zoomCoeff, wheelZoomCoeff, showTeamColors, showAvatars, showPlayerIds, resolutionScale, followPlayerId, restrictCameraOrigin, followMode, showChatIndicators, drawBackground, squarePlayers, currentPlayerDistinction, showInvisibleSegments, showVertices, generalLineWidth, discLineWidth } = snapshot;
    Object.assign(thisRenderer, {
      webGPU, 
      extrapolation, 
      showTeamColors, 
      showAvatars, 
      showPlayerIds, 
      zoomCoeff, 
      wheelZoomCoeff, 
      resolutionScale, 
      showChatIndicators, 
      restrictCameraOrigin, 
      followMode, 
      followPlayerId, 
      drawBackground, 
      squarePlayers, 
      currentPlayerDistinction, 
      showInvisibleSegments, 
      showVertices, 
      generalLineWidth, 
      discLineWidth,
    });
    /*
    customDiscInfo = snapshot.customDiscInfo;
    customJointInfo = snapshot.customJointInfo;
    customSegmentInfo = snapshot.customSegmentInfo;
    customHaloInfo = snapshot.customHaloInfo;
    textInfo = snapshot.textInfo;
    locationIndicatorInfo = snapshot.locationIndicatorInfo;
    chatIndicatorInfo = snapshot.chatIndicatorInfo;
    */
    scale = snapshot.scale;
    origin = snapshot.origin;
    gamePaused = snapshot.gamePaused;
  };
};