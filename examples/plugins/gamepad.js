module.exports = function (API) {
    var { AllowFlags, Plugin, Utils } = API;

    Object.setPrototypeOf(this, Plugin.prototype);
    Plugin.call(this, "gamepad", true, { // "gamepad" is plugin's name, "true" means "activated just after initialization". Every plugin should have a unique name.
        version: "0.1",
        author: "mtkcnl",
        description: `This is a plugin which helps you to play with a controller/gamepad. Tested with a 9th Gen. Xbox Controller.`,
        allowFlags: AllowFlags.CreateRoom | AllowFlags.JoinRoom // We allow this plugin to be activated on both CreateRoom and JoinRoom.
    });
    /**@type {Gamepad | null}*/ let gamepad = null;

    // /**@type {String[]}*/
    // const buttons = [
    //     "A (X)",
    //     "B (Circle)",
    //     "X (square)",
    //     "Y (Triangle)",
    //     "LB (L1)",
    //     "RB (R1)",
    //     "LT (L2)",
    //     "RT (R2)",
    //     "BACK (SELECT)",
    //     "START (OPTIONS)",
    //     "Left Stick",
    //     "Right Stick",
    //     "DPAD-UP",
    //     "DPAD-DOWN",
    //     "DPAD-LEFT",
    //     "DPAD-RIGHT",
    // ];
    // const html_content = `
    //     <html>

    //     </html>
    // `
    
    /**
     * @param {GamepadEvent} event 
     */
    function gamepad_connected(event) {
        console.log(`Gamepad connected.\nIndex: ${event.gamepad.index}`);
        gamepad ??= event.gamepad;
    }
    /**
     * @param {GamepadEvent} event 
     */
    function gamepad_disconnected(event) {
        console.log("disconnected")
        event.gamepad === gamepad ? (gamepad = null, console.log("Gamepad disconnected.")) : void (0);
    }

    this.initialize = function () {
        window.ongamepaddisconnected = gamepad_disconnected;
        window.ongamepadconnected = gamepad_connected;
        console.log("initialize");
        const gamepads = navigator.getGamepads();
        console.log(gamepads);
        if (gamepads.length) gamepad ??= gamepads.find(v => v !== null)
        gamepad?.vibrationActuator?.playEffect("dual-rumble", { duration: 150, strongMagnitude: .8 }); // Little vibration to notice user about gamepad has found.
    };
    this.finalize = function () { 
        window.ongamepadconnected = null;
        window.ongamepaddisconnected = null;
    };

    this.onGameTick = () => {
        /*
            0: A (X)
            1: B (Circle)
            2: X (square)
            3: Y (Triangle)
            4: LB (L1)
            5: RB (R1)
            6: LT (L2)
            7: RT (R2)
            8: BACK (SELECT)
            9 : START (Options)
            10:Left Stick
            11: Right Stick
            12: DPAD-UP
            13: DPAD-DOWN
            14: DPAD-LEFT
            15: DPAD-RIGHT
        */
        if (gamepad) 
        {
            // Why the fuck we don't have callback for pressed buttons?
            gamepad = navigator.getGamepads()[gamepad?.index];
            if (!gamepad) return;
            const btns = gamepad.buttons;
            let dirX = btns[14].pressed ? -1 : btns[15].pressed ? 1 : 0, 
            dirY = btns[12].pressed ? -1 : btns[13].pressed ? 1 : 0, 
            kick = btns[0].pressed;
            this.room.setKeyState(Utils.keyState(dirX, dirY, kick));
        }

    }
}