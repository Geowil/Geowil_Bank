/*:
* @plugindesc Creates a bank system where the player can deposite money, buy bonds, invest in stocks, and other things yet to be determined.
* @author Geowil
*
* @param Invalid Gold Color
* @desc Sets the text color of the gold counter when it is higher than the amount of gold the player has
* @default #AE0C0C
*
* @param Immature Bond Color
* @desc Sets the text color to be used to highlight immature bonds
* @default #FF0000
*
* @param Gold Counter Button 1 Value
* @desc Sets the denomination of gold that clicking on the first up or down buttons in the gold counter window will change
* @default 10
*
* @param Gold Counter Button 2 Value
* @desc Sets the denomination of gold that clicking on the second up or down buttons in the gold counter window will change
* @default 100
*
* @param Add Bond Overwrites
* @desc This setting will determine if AddBond plugin command overwrites an existing bond information record
* @type boolean
* @default false
*
* @param Bond System Active
* @desc Allows you to turn on or off the bond system
* @type boolean
* @default true
*
* @param Time Denomination
* @type select
* @option Seconds
* @option Minutes
* @option Hours
* @option Days
* @desc Choose the default time mode for all banks.  This can be customized through a plugin command on a per-bank basis
* @default Hours
*
* @help
* Thanks for using my bank script.  Some notes on how this should be used:
* 
* To open a bank, create an event and add a plugin command following the below example:
* BankOpen <BankID> <BankInterestRate>
*
* Where <BankID> is the ID for the bank you want to access from this event and <BankInterestRate> is the amount of interest for the bank
*
* Example: BankOpen 0 10
*
* The example will open bank 0 and set its interest rate to 10.
*
* Other plugin command features:
* There are a few other plugin commands that you can use to take advantage of the other features of the plugin relating to bonds.
*
* Bank <BankID> AddBond <BondInfoID> <Bond Name> <Bond Cost> <Bond Matured Value> <Bond Mature Time> <Bond Help Text>
*
* The above plugin command allows you to create a new bond at the specifid bank.  Here is a breakdown of what the values are used for:
*
* <BankID> - ID for the bank the bond should be added to.
* <BondInfoID> - ID for the bond info record at that bank, this ID can be used to later update this specific record.
* <Bond Name> - The name for the bond that will show up in the 'Buy Bond' selection list.
* <Bond Cost> - How much it will cost the player to buy the bond.
* <Bond Matured Value> - How much the player will be able to sell the bond for once it has fully matured.
* <Bond Mature Time> - The amount of time it will take for the bond to fully mature.
* <Bond Help Text> - Sets the help text that will be displayed for the bond in the 'Buy Bond' window.
*
* Example: Bank 0 AddBond 0 Baisc Bond 10 1000 4000 10 This bond will mature after 10 hours.\nGains 20% interest at maturation.
*
* The above example create a new bond information record for bank 0 with the specified values
*
*-----------
*
* Bank <BankID> UpdateBond <BondInfoID> <Bond Name> <Bond Cost> <Bond Matured Value> <Bond Mature Time> <Bond Help Text>
*
* The above plugin command allows you to update an existing bond at the specifid bank.  Here is a breakdown of what the values are used for:
*
* Example: Bank 0 UpdateBond 0 Baisc Bond 10 2000 8000 10 This bond will mature after 10 hours.\nGains 20% interest at maturation.
*
* The above example modified the bond information record we created with the AddBond example at bank 0.
*
*-----------
*
* The last command allows you to modify the operational behavior of the AddBond command.  Normally, with the 'Add Bond Overwrites' parameter set to false
* the AddBond plugin command will ignore any bond information record that already exists at the bank id you specified.  However when 'Add Bond Overwrites'
* is true then AddBond will behave like an UpdateBond command for any existing record at that bank.  The next plugin command allows you to turn this parameter
* on or off from an event.
*
* Bank AddOverwrites <On/Off>
*
*
*
* Possible Conflicts:
* Anything which modified DataManager.createGameObjects, DataManager.createSaveContents, or DataManager.extractSaveContents will conflict with this pluign
* if not handled through aliasing or some other method. 
*
*
* Credits:
* SephirothSpawn - original RMXP script creator
*/

//TODO: make bool param checks against strings and change any onProcessOk to processOk and add in cancel com list handling


var Geowil = Geowil || {};

function Scene_Bank() { this.initialize.apply(this,arguments); };
function Window_BankDetails() { this.initialize.apply(this,arguments); };
function Window_ActionPane() { this.initialize.apply(this,arguments); };
function Window_CommandPane() { this.initialize.apply(this,arguments); };
function Window_Deposit() { this.initialize.apply(this,arguments); };
function Window_Withdraw() { this.initialize.apply(this,arguments); };
function Window_BuyBond() { this.initialize.apply(this,arguments); };
function Window_BuyBondDetails() { this.initialize.apply(this,arguments); };
function Window_SellBond() { this.initialize.apply(this,arguments); };
function Window_SellBondDetails() { this.initialize.apply(this,arguments); };

(function(_) {
	"use strict";
	
	const params = PluginManager.parameters('Geowil_Bank');

	//Param Plugin Var
	var gInvalidColor = String(params['Invalid Gold Color']);
	var bImmatureColor = String(params['Immature Bond Color']);
	var gBtn1Value = parseInt(params['Gold Counter Button 1 Value']);
	var gBtn2Value = parseInt(params['Gold Counter Button 2 Value']);
	var bAddBondOverwrites = (params['Add Bond Overwrites'] === "true") 
	var timeDemo = String(params['Time Denomination'])
	var bIsBondSysActive = (params['Bond System Active'] === "true")


	/**********
	* Bond
	* Stores bond details
	***********
	*/

	var DataManager_makeSaveContents = DataManager.makeSaveContents;
	DataManager.makeSaveContents = function() {
	    // A save data does not contain $gameTemp, $gameMessage, and $gameTroop.
	    var contents = DataManager_makeSaveContents.call(this);
	    contents.banks        = $gameBanks; //For GeoWil_BankPlugin
	    return contents;
	};
	
	function Bond() { this.initialize.apply(this,arguments); };
	Bond.prototype.initialize = function() { this.initMembers(); };
	Bond.prototype.createBond = function(bID, bName, bCost,bMValue, bMTime, bPrTime){
		this._id = bID;
		this._name = bName;
		this._cost = bCost;
		this._maturedValue = bMValue;
		this._matureTime = bMTime;
		this._purchaseDate = bPrTime;
	};

	Bond.prototype.initMembers = function(){
		this._id = 0;
		this._name = "";
		this._cost = 0;
		this._maturedValue = 0;
		this._matureTime = 0;
		this._purchaseDate = Date.parse("0");
	};

	Bond.prototype.setID = function(bID) { this._id = bID; };
	Bond.prototype.setName = function(bName) { this._name = bName; };
	Bond.prototype.setCost = function(bCost) { this._cost = bCost; };
	Bond.prototype.setMValue = function(mVal) { this._maturedValue = mVal; };
	Bond.prototype.setMTime = function(mTime) { this._matureTime = mTime; };
	Bond.prototype.setPrDate = function(bPDate) { this._purchaseDate = bPDate; };
	Bond.prototype.getID = function() { return this._id; };
	Bond.prototype.getName = function() { return this._name; };
	Bond.prototype.getCost = function() { return this._cost; };
	Bond.prototype.getMValue = function() { return this._maturedValue; };
	Bond.prototype.getMTime = function() { return this._matureTime; };
	Bond.prototype.getPrDate = function() { return this._purchaseDate; };


	//Bank Data
	var bank = {};
	var bond = {};
	var bankBonds = {};
	var bankId = 0;
	var bndId = 0;

	var tDoms = ["Seconds","Minutes","Hours","Days"];


	var DataManager_CreateGameObjects = DataManager.createGameObjects;
	DataManager.createGameObjects = function(){
		DataManager_CreateGameObjects.call(this,arguments);
		$gameBanks         = new Game_Banks();
	};


	/* Game Interpreter */
	var Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
	Game_Interpreter.prototype.pluginCommand = function(command, args){
		Game_Interpreter_pluginCommand.call(this,command,args);
		var matches = [];

		if (command === 'BankOpen' || command === 'Bank'){
			for (var i1 = 0; i1 < args.length; i1++){
				command += " " + args[i1];
			}
		}

		if (command.match(/BankOpen[ ](\d+)[ ](\d+)/)){
			matches = (/BankOpen[ ](\d+)[ ](\d+)/.exec(command) || []);
			createBankRecord(matches[1],matches[2]);
			SceneManager.push(Scene_Bank);
		} else if(command.match(/BankOpen[ ](\d+)[ ](\d+)[ ](\w*)/)){
			matches = (/BankOpen[ ](\d+)[ ](\d+)[ ](\w*)/.exec(command) || []);

			createBankRecordWithTime(matches[1],matches[2],matches[3]);
		} else if (command.match(/Bank[ ](\d+)[ ]AddBond[ ](\d+)[ ](\w.*.\w)[ ](\d+)[ ](\d+)[ ](\d+)[ ](\w.*.\w\W)/)){
			matches = (/Bank[ ](\d+)[ ]AddBond[ ](\d+)[ ](\w.*.\w)[ ](\d+)[ ](\d+)[ ](\d+)[ ](\w.*.\w\W)/.exec(command) || []);

			createBankBond(parseInt(matches[1]),parseInt(matches[2]),matches[3],parseInt(matches[4]),parseInt(matches[5]),parseInt(matches[6]),matches[7]);
		} else if (command.match(/Bank[ ](\d+)[ ]UpdateBond[ ](\d+)[ ](\w.*.\w)[ ](\d+)[ ](\d+)[ ](\d+)[ ](\w.*.\w\W)/)){
			matches = (/Bank[ ](\d+)[ ]UpdateBond[ ](\d+)[ ](\w.*.\w)[ ](\d+)[ ](\d+)[ ](\d+)[ ](\w.*.\w\W)/.exec(command) || []);

			updateBankBond(parseInt(matches[1]),parseInt(matches[2]),matches[3],parseInt(matches[4]),parseInt(matches[5]),parseInt(matches[6]),matches[7]);
		} else if (command.match(/Bank[ ]AddOverwrites[ ](\w+$)/)){
			matches = (/Bank[ ]AddOverwrites[ ](\w+$)/.exec(command) || []);

			toggleAddOverwrites(matches[1]);
		} else if (command.match(/Bank[ ](\d+)[ ]ChangeTimeUnit[ ](\w*)/)){
			matches = (/Bank[ ](\d+)[ ]ChangeTimeUnit[ ](\w*)/.exec(command) || []);

			if (tDoms.includes(matches[2])){
				if ($gameBanks.getTimeUnit(RegExp.$1) != RegExp.$2){
					$gameBanks.updateTimeUnit(RegExp.$1,RegExp.$2);
				}
			}
		} else if (command.match(/Bank[ ](\d+)[ ]BondSystemEnabled[ ](\d+)/)){
			matches = (/Bank[ ](\d+)[ ]BondSystemEnabled[ ](\d+)/.exec(command) || []);

			$gameBanks.changeBondSystem(matches[1],matches[2]);
		}
	};

	function toggleAddOverwrites(cmdArg){
		if (cmdArg == 'On') { bAddBondOverwrites = true; }
		else { bAddBondOverwrites = false; }
	}

	function createBankRecord(bankID,interestAmt){
		if ($gameBanks.bankExists(parseInt(bankID))){
			//Check if bank interest is 0 and if interest param is not
			if ($gameBanks.getInterest(bankID) == 0 && interestAmt != 0){
				$gameBanks.setInterest(bankID,interestAmt);
			}

			bank = $gameBanks.getBank(parseInt(bankID));			
			bankId = parseInt(bankID);

			calcInterest();
		} else{
			$gameBanks.addBank(parseInt(bankID),0,parseInt(interestAmt),Date.parse('0'),timeDemo,bIsBondSysActive);

			bank = $gameBanks.getBank(parseInt(bankID));
			bankId = parseInt(bankID);
		}		
	};

	function createBankRecordWithTime(bankID,interestAmt,tmDemo){
		if ($gameBanks.bankExists(parseInt(bankID))){
			//Check if bank interest is 0 and if interest param is not
			if ($gameBanks.getInterest(bankID) == 0 && interestAmt != 0){
				$gameBanks.setInterest(bankID,interestAmt);
			}

			bank = $gameBanks.getBank(parseInt(bankID));
			bankId = parseInt(bankID);

			calcInterest();
		} else{
			$gameBanks.addBank(parseInt(bankID),0,parseInt(interestAmt),Date.parse('0'),timeDemo,bIsBondSysActive);
			$gameBanks.updateTimeUnit(bankID,tmDemo);

			bank = $gameBanks.getBank(parseInt(bankID));
			bankId = parseInt(bankID);
		}		
	};

	function calcInterest(){
		//Calculate interest
		var bankTUnit = bank["timeUnit"];
		var dateNow = Date.now();
		var timeDifference = bank["lastAccess"] == Date.parse('0') ? Date.parse('0'):dateNow-bank["lastAccess"];
		
		if (timeDifference != 0){
			var tmDifference = 0;
			if (bankTUnit == "Hours"){
				tmDifference = Math.floor((timeDifference/1000)/60/60);
			} else if (bankTUnit == "Seconds"){
				tmDifference = Math.floor((timeDifference/1000));
			} else if (bankTUnit == "Minutes"){
				tmDifference = Math.floor((timeDifference/1000)/60);
			} else if (bankTUnit == "Days"){
				tmDifference = Math.floor((timeDifference/1000)/60/60/24);
			}

			bank["balance"] += (((tmDifference*bank["interest"])/100)*bank["balance"]);
		}
	};

	function createBankBond(bankId,bndId,bndName,bndcost,bndMVal,bndMTime,bndHTxt){
		//Chekc to see if the bank exists, if not create it
		if ($gameBanks.bankExists(parseInt(bankId)) == false){
			$gameBanks.addBank(parseInt(bankId),0,0,Date.parse('0'),timeDemo,bIsBondSysActive);	
		}

		//Check if any bonds exist in the bank
		if ($gameBanks.bIsBndSysActive(bankId)){
			if (!$gameBanks.bDoesBondExist(bankId,bndId)){
				$gameBanks.addBondInfo(bankId,bndId,bndName,bndcost,bndMVal,bndMTime,bndHTxt);
			} else if (bAddBondOverwrites){
				$gameBanks.updateBondInfo(bankId,bndId,bndName,bndcost,bndMVal,bndMTime,bndHTxt);
			}
		}
	};

	function updateBankBond(bankId,bndId,bndName,bndcost,bndMVal,bndMTime,bndHTxt){
		//Check if any bonds exist in the bank
		if ($gameBanks.bIsBndSysActive(bankId)){
			if (!$gameBanks.bDoesBondExist(bankId,bndId)){
				$gameBanks.addBondInfo(bankId,bndId,bndName,bndcost,bndMVal,bndMTime,bndHTxt);
			} else {
				$gameBanks.updateBondInfo(bankId,bndId,bndName,bndcost,bndMVal,bndMTime,bndHTxt);
			}
		}	
	};

	function updateBank(newBank,bPlayerLeaving){
		if (bPlayerLeaving){
			$gameBanks.setLastAccess(bankId,Date.now());
		} else{
			$gameBanks.updateBank(bankId,newBank);
			bank = newBank;
		}
	};

	/* Scene_Bank */
	Scene_Bank.prototype = Object.create(Scene_MenuBase.prototype);
	Scene_Bank.prototype.constructor = Scene_Bank;

	Scene_Bank.prototype.initialize = function() { Scene_MenuBase.prototype.initialize.call(this); };
	Scene_Bank.prototype.create = function(){
		Scene_MenuBase.prototype.create.call(this);

		this.createHelpWindow();
		this.createWindows();
	};

	Scene_Bank.prototype.createWindows = function(){
		this.createBankDetailsWnd();
		this.createActionPane();
		//this.createDepoWnd();

		updateBank(bank,false);

		this._bnkDetailsWnd.show();
		this._actPane.activate();
		this._actPane.show();
		this._actPane.select();
		this._bnkDetailsWnd.refresh();
	};

	Scene_Bank.prototype.createActionPane = function(){
		const winW = 140;
		const winH = 300;
		const winX = Graphics.width - winW;
		const winY = Graphics.height - winH;
		
		this._actPane = new Window_ActionPane(winX,winY,winW,winH);
		this._actPane.setHandler('ok',this.bankActionSelected.bind(this));
		this._actPane.setHandler('cancel',this.actionPaneCancel.bind(this));
		this._actPane.setHelpWindow(this._helpWindow);
		this._actPane.showHelpWindow();
		this._actPane.refresh();
		this.addWindow(this._actPane);
	};

	Scene_Bank.prototype.actionPaneCancel = function(){
		updateBank(bank,true);
		this._actPane.hide();
		this._actPane.deactivate();
		this._bnkDetailsWnd.hide();
		this._bnkDetailsWnd.deactivate();

		SceneManager.pop();
	}

	Scene_Bank.prototype.createBankDetailsWnd = function(){
		const winW = 335;
		const winH = Graphics.height - this._helpWindow.height - 285;
		const winX = 0;
		const winY = this._helpWindow.height + 35;

		this._bnkDetailsWnd = new Window_BankDetails(winX,winY,winW,winH,bank)
		this._bnkDetailsWnd.show();
		this._bnkDetailsWnd.refresh();
		this.addWindow(this._bnkDetailsWnd);
	};

	Scene_Bank.prototype.createDepoWnd = function(){
		const winW = 375;
		const winH = 125;
		const winX = Graphics.width - winW;
		const winY = Graphics.height - winH;

		this._depoWnd = new Window_Deposit(winX,winY,winW,winH,bank);
		this._depoWnd.setHandler('ok',this.depoOK.bind(this));
		this._depoWnd.setHandler('cancel',this.depoCancel.bind(this));
		this._depoWnd.refresh();
		this.addWindow(this._depoWnd);
	};

	Scene_Bank.prototype.createWithdrawWnd = function(){
		const winW = 375;
		const winH = 125;
		const winX = Graphics.width - winW;
		const winY = Graphics.height - winH;

		this._withdrawWnd = new Window_Withdraw(winX,winY,winW,winH,bank);
		this._withdrawWnd.setHandler('ok',this.withdrawOK.bind(this));
		this._withdrawWnd.setHandler('cancel',this.withdrawCancel.bind(this));
		this._withdrawWnd.refresh();
		this.addWindow(this._withdrawWnd);
	};

	Scene_Bank.prototype.bankActionSelected = function(){
		if (this._actPane.getSelectedAction() == "Deposit"){
			this.createDepoWnd();

			this._actPane.hide();
			this._actPane.deactivate();
			this._depoWnd.show();
			this._depoWnd.activate();
			this._depoWnd.select();
		} else if (this._actPane.getSelectedAction() == "Withdraw"){
			this.createWithdrawWnd();

			this._actPane.hide();
			this._actPane.deactivate();
			this._withdrawWnd.show();
			this._withdrawWnd.activate();
			this._withdrawWnd.select();
		} else if (this._actPane.getSelectedAction() == "Buy Bond"){
			this.createBuyBondWnd();

			this._actPane.hide();
			this._actPane.deactivate();
			this._buyBondWnd.show();
			this._buyBondWnd.activate();
			this._buyBondWnd.select();
		} else if (this._actPane.getSelectedAction() == "Sell Bond"){
			this.createSellBondWnd();

			this._actPane.hide();
			this._actPane.deactivate();
			this._sellBondWnd.show();
			this._sellBondWnd.activate();
			this._sellBondWnd.select();
		} else if (this._actPane.getSelectedAction() == "Cancel"){
			SceneManager.pop();
		}
	};

	Scene_Bank.prototype.depoOK = function(){
		updateBank(this._depoWnd.getBank(),false);

		this._depoWnd.hide();
		this._depoWnd.deactivate();
		this._actPane.show();
		this._actPane.activate();
		this._bnkDetailsWnd.setBank(bank);
		this._bnkDetailsWnd.refresh();
	};

	Scene_Bank.prototype.depoCancel = function(){
		this._depoWnd.hide();
		this._depoWnd.deactivate();
		this._actPane.show();
		this._actPane.activate();
		this._actPane.select();
	};

	Scene_Bank.prototype.withdrawOK = function(){
		updateBank(this._withdrawWnd.getBank(),false);

		this._withdrawWnd.hide();
		this._withdrawWnd.deactivate();
		this._actPane.show();
		this._actPane.activate();
		this._bnkDetailsWnd.setBank(bank);
		this._bnkDetailsWnd.refresh();
	};

	Scene_Bank.prototype.withdrawCancel = function(){
		this._withdrawWnd.hide();
		this._withdrawWnd.deactivate();
		this._actPane.show();
		this._actPane.activate();
		this._actPane.select();
	};

	Scene_Bank.prototype.createBuyBondWnd = function(){
		const winW = 175;
		const winH = 360;
		const winX = Graphics.width - winW;
		const winY = Graphics.height - winH;
		
		this._buyBondWnd = new Window_BuyBond(winX,winY,winW,winH,bank);
		this._buyBondWnd.setHandler('ok',this.buyBondOK.bind(this));
		this._buyBondWnd.setHandler('cancel',this.buyBondCancel.bind(this));
		this._buyBondWnd.setHelpWindow(this._helpWindow);
		this._buyBondWnd.showHelpWindow();
		this._buyBondWnd.refresh();
		this.addWindow(this._buyBondWnd);
	}

	Scene_Bank.prototype.buyBondOK = function(){
		var bondInfoID = this._buyBondWnd.getSelectedBond();
		var bondInfo = bank["bondInfo"][bondInfoID];
		bndId += 1;

		this.createBond(bndId,bondInfo["name"],bondInfo["cost"],bondInfo["maturedValue"],bondInfo["matureTime"],Date.now());
	}

	Scene_Bank.prototype.createBond = function(bndId,bndName,bndCost,bndMVal,bndMTime,bndPDate){
		bond = new Bond();
		bond.createBond(bndId,bndName,bndCost,bndMVal,bndMTime,bndPDate);

		this.createBuyBondDetailsWnd();

		this._buyBondWnd.deactivate();
		this._buyBondWnd.show();
		this._buyBondDtlsWnd.activate();
		this._buyBondDtlsWnd.refresh();
	}

	Scene_Bank.prototype.buyBondCancel = function(){
		this._buyBondWnd.hide();
		this._buyBondWnd.deactivate();
		this._actPane.show();
		this._actPane.activate();
		this._actPane.select();
		this._bnkDetailsWnd.refresh();
	}

	Scene_Bank.prototype.createBuyBondDetailsWnd = function(){
		const winW = 560;
		const winH = Graphics.height - this._bnkDetailsWnd.height - this._helpWindow.height - 120;
		const winX = 0;
		const winY = this._bnkDetailsWnd.height + this._helpWindow.height + 72;

		this._buyBondDtlsWnd = new Window_BuyBondDetails(winX,winY,winW,winH,bank,bond);
		this._buyBondDtlsWnd.setHandler('ok',this.buyBond.bind(this));
		this._buyBondDtlsWnd.setHandler('cancel',this.cancelBuyBond.bind(this));
		this.addWindow(this._buyBondDtlsWnd);
	}

	Scene_Bank.prototype.buyBond = function(){
		$gameParty.loseGold(bond.getCost());
		bond.setPrDate(Date.now());
		$gameBanks.addBond(bankId,bond.getID(),bond.getName(),bond.getCost(),bond.getMValue(),bond.getMTime(),bond.getPrDate());

		bank = $gameBanks.getBank(bankId);

		this._buyBondDtlsWnd.hide();
		this._buyBondDtlsWnd.deactivate();
		this._buyBondWnd.select();
		this._buyBondWnd.activate();
		this._bnkDetailsWnd.setBank(bank);
		this._bnkDetailsWnd.refresh();
	}

	Scene_Bank.prototype.cancelBuyBond = function(){
		this._buyBondDtlsWnd.hide();
		this._buyBondDtlsWnd.deactivate();
		this._buyBondWnd.select();
		this._buyBondWnd.activate();
		this._bnkDetailsWnd.refresh();
	}

	Scene_Bank.prototype.createSellBondWnd = function(){
		const winW = 175;
		const winH = 360;
		const winX = Graphics.width - winW;
		const winY = Graphics.height - winH;
		
		this._sellBondWnd = new Window_SellBond(winX,winY,winW,winH,bank);
		this._sellBondWnd.setHandler('ok',this.sellBondOK.bind(this));
		this._sellBondWnd.setHandler('cancel',this.sellBondCancel.bind(this));
		this._sellBondWnd.setHelpWindow(this._helpWindow);
		this._sellBondWnd.showHelpWindow();
		this._sellBondWnd.refresh();
		this.addWindow(this._sellBondWnd);
	}

	Scene_Bank.prototype.sellBondOK = function(){
		var bCName = this._sellBondWnd.getSelectedAction();
		bond = this._sellBondWnd.getBond(bCName);

		this.createSellBondDetailsWnd();
		this._sellBondWnd.deactivate();
		this._sellBondDtlsWnd.activate();
		this._sellBondDtlsWnd.show();
		this._sellBondDtlsWnd.refresh();		
	}

	Scene_Bank.prototype.sellBondCancel = function(){
		this._sellBondWnd.hide();
		this._sellBondWnd.deactivate();
		this._actPane.show();
		this._actPane.activate();
		this._actPane.select();
		this._bnkDetailsWnd.refresh();
	}

	Scene_Bank.prototype.createSellBondDetailsWnd = function(){
		const winW = 560;
		const winH = Graphics.height - this._bnkDetailsWnd.height - this._helpWindow.height - 120;
		const winX = 0;
		const winY = this._bnkDetailsWnd.height + this._helpWindow.height + 72;

		this._sellBondDtlsWnd = new Window_SellBondDetails(winX,winY,winW,winH,bank,bond);
		this._sellBondDtlsWnd.setHandler('ok',this.sellBond.bind(this));
		this._sellBondDtlsWnd.setHandler('cancel',this.cancelSellBond.bind(this));
		this.addWindow(this._sellBondDtlsWnd);
	}

	Scene_Bank.prototype.sellBond = function(){
		$gameParty.gainGold(bond["maturedValue"]);
		
		$gameBanks.removeBond(bankId,bond);
		bank = $gameBanks.getBank(bankId);

		this._sellBondDtlsWnd.hide();
		this._sellBondDtlsWnd.deactivate();
		this._sellBondWnd.select();
		this._sellBondWnd.activate();
		this._bnkDetailsWnd.setBank(bank);
		this._bnkDetailsWnd.refresh();
		this._sellBondWnd.setBank(bank);
		this._sellBondWnd.setup();
		this._sellBondWnd.refresh();
	}

	Scene_Bank.prototype.cancelSellBond = function(){
		this._sellBondDtlsWnd.hide();
		this._sellBondDtlsWnd.deactivate();
		this._sellBondWnd.select();
		this._sellBondWnd.activate();
		this._bnkDetailsWnd.refresh();
	}


	/* Window_ActionPane */
	Window_ActionPane.prototype = Object.create(Window_Selectable.prototype);
	Window_ActionPane.prototype.constructor = Window_ActionPane;

	Window_ActionPane.prototype.initialize = function(x,y,w,h){
		Window_Selectable.prototype.initialize.call(this,x,y,w,h);

		this._comList = ["Deposit","Withdraw"]; //,"Buy Stock","Sell Stock","Cancel"];
		this._helpTxtList = ["Deposit Gold into your account","Withdraw Gold from your account"];

		if ($gameBanks.bIsBndSysActive(bankId)){
			this._comList.push("Buy Bond");
			this._comList.push("Sell Bond");

			this._helpTxtList.push("Buy a bond that will mature over time");
			this._helpTxtList.push("Sell a mature bond");
		}

		this._comList.push("Cancel"); //"Buy stock in a company","Sell stock in a company","End transaction"];
		this._helpTxtList.push("End Transaction");
		
		this._index = 0;
		this._selectedAction = "";
	};

	Window_ActionPane.prototype.updateHelp = function(){
		this._helpWindow.clear();
		this._helpWindow.setText(this._helpTxtList[this._index]);
	};

	Window_ActionPane.prototype.getHelpWindowText = function() { return this._helpWindow._text; };
	Window_ActionPane.prototype.setSelectedAction = function (selAct) { this._selectedAction = selAct; };
	Window_ActionPane.prototype.getSelectedAction = function() { return this._selectedAction; };
	Window_ActionPane.prototype.getHelpWindow = function() { return this._helpWindow; };
	Window_ActionPane.prototype.maxCols = function() { return 1; };
	Window_ActionPane.prototype.maxItems = function() { return this._comList ? this._comList.length : 1; };
	Window_ActionPane.prototype.itemHeight = function() { return 35; };	
	Window_ActionPane.prototype.numVisibleRows = function() { return 4; };
	Window_ActionPane.prototype.spacing = function() { return 8; };
	Window_ActionPane.prototype.drawItem = function(index) { this.drawActionItem(index,this._itmX, this._itmY, this._itmW); };
	Window_ActionPane.prototype.drawActionItem = function(index, itmX, itmY, itmW){
		this.contents.fontSize = 20;
		var rect = this.itemRectForText(index);
		var x = rect.x;
		var y = this._itmW+rect.y+rect.height/2 - this.lineHeight() * 0.5;
		var w = rect.width -x - this.textPadding();

		this.drawText(this._comList[index],rect.x,rect.y,rect.width,'left');
	};

	Window_ActionPane.prototype.processOk = function(){
		var selAct = this._comList[this._index];
		this.setSelectedAction(selAct);

		Window_Selectable.prototype.processOk.call(this);
	};


	/* Window Deposit */ 
	Window_Deposit.prototype = Object.create(Window_Selectable.prototype);
	Window_Deposit.prototype.constructor = Window_Deposit;

	Window_Deposit.prototype.initialize = function(x,y,w,h,bnk){
		Window_Selectable.prototype.initialize.call(this,x,y,w,h);

		this._buttons = [];
		this._bnk = bnk;
		this._depoGold = this._bnk["balance"];
		this._newDepo = 0;
		this._currencyUnit = TextManager.currencyUnit;
		this._width = w;
		this._height = h;
		this._x = x;
		this._y = y;
		this._max = 9999999999;

		this.createButtons();
		this.placeButtons();
	    this.updateButtonsVisiblity();
	    this.refresh();
	};

	Window_Deposit.prototype.createButtons = function() {
	    var bitmap = ImageManager.loadSystem('DepoButtonSet');
	    var buttonWidth = 48;
	    var buttonHeight = 48;
	    
	    for (var i = 0; i < 5; i++) {
	        var button = new Sprite_Button();
	        var x = buttonWidth * i;
	        var w = buttonWidth * (i === 4 ? 2 : 1);
	        button.bitmap = bitmap;
	        button.setColdFrame(x, 0, w, buttonHeight);
	        button.setHotFrame(x, buttonHeight, w, buttonHeight);
	        button.visible = false;
	        button.width = w;
	        button.height = buttonHeight;
	        this._buttons.push(button);
	        this.addChild(button);
	    }

	    this._buttons[0].setClickHandler(this.onButtonUp.bind(this));
	    this._buttons[1].setClickHandler(this.onButtonUp10.bind(this));
	    this._buttons[2].setClickHandler(this.onButtonDown.bind(this));
	    this._buttons[3].setClickHandler(this.onButtonDown10.bind(this));
	    this._buttons[4].setClickHandler(this.onButtonOk.bind(this));
	};

	Window_Deposit.prototype.placeButtons = function() {
	    var numButtons = this._buttons.length;
	    var spacing = 16;
	    var totalWidth = -spacing;

	    for (var i = 0; i < numButtons; i++) {
	        totalWidth += this._buttons[i].width + spacing;
	    }

	    var x1 = 172;
	    var x2 = 172;
	    for (var j = 0; j < numButtons; j++) {
	        var button = this._buttons[j];	    

	        if (j < 2){
	    		button.y = (this._height - 56) - button.height;
	    		button.x = x1;
	       		x1 += button.width+3;
	    	} else{
	    		button.y = this._height - 56;
	    		button.x = x2;
	        	x2 += button.width+3;
	    	}	        
	    }
	};

	Window_Deposit.prototype.updateButtonsVisiblity = function() {
	    if (TouchInput.date > Input.date) {
	        this.showButtons();
	    } else {
	        this.hideButtons();
	    }
	};

	Window_Deposit.prototype.showButtons = function() {
	    for (var i = 0; i < this._buttons.length; i++) {
	        this._buttons[i].visible = true;
	    }
	};

	Window_Deposit.prototype.hideButtons = function() {
	    for (var i = 0; i < this._buttons.length; i++) {
	        this._buttons[i].visible = false;
	    }
	};

	Window_Deposit.prototype.refresh = function() {
	    this.contents.clear();	    
	    this.drawGold(false);
	};

	Window_Deposit.prototype.drawGold = function(bIsInvalid) {
	    var x = -5;
	    var y = this._height - 66;
	    var width = 150;
	    if (bIsInvalid){
	    	this.changeTextColor(gInvalidColor);
	    }
	    else{
	    	this.resetTextColor();
	    }

	    this.drawText(this._newDepo, x, y, width, 'right');
	};

	Window_Deposit.prototype.itemY = function() { return Math.round(this.contentsHeight() / 2 - this.lineHeight() * 1.5); };
	Window_Deposit.prototype.buttonY = function() { return Math.round(this.priceY() + this.lineHeight() * 2.5); };
	Window_Deposit.prototype.cursorX = function() { return 10; };
	Window_Deposit.prototype.maxDigits = function() { return 10; };
	Window_Deposit.prototype.update = function() {
	    Window_Selectable.prototype.update.call(this);
	    this.processGoldChange();
	};

	Window_Deposit.prototype.isOkTriggered = function() { return Input.isTriggered('ok'); };
	Window_Deposit.prototype.processGoldChange = function() {
	    if (this.isOpenAndActive()) {
	        if (Input.isRepeated('right')) { this.changeGold(gBtn1Value); }
	        if (Input.isRepeated('left')) { this.changeGold(-1 * gBtn1Value); }
	        if (Input.isRepeated('up')) { this.changeGold(gBtn2Value); }
	        if (Input.isRepeated('down')) { this.changeGold(-1 * gBtn2Value); }
	    }
	};

	Window_Deposit.prototype.changeGold = function(amount) {
	    var lastGold = this._depoGold;
	    this._newDepo = (this._newDepo + amount).clamp(0, this._max);
	    if (this._depoGold+this._newDepo !== lastGold  || this._newDepo == 0) {
	        SoundManager.playCursor();
	        this.refresh();
	    }
	};

	Window_Deposit.prototype.onButtonUp = function() { this.changeGold(gBtn1Value); };
	Window_Deposit.prototype.onButtonUp10 = function() { this.changeGold(gBtn2Value); };
	Window_Deposit.prototype.onButtonDown = function() { this.changeGold(-1 * gBtn1Value); };
	Window_Deposit.prototype.onButtonDown10 = function() { this.changeGold(-1 * gBtn2Value); };
	Window_Deposit.prototype.onButtonOk = function() {
	    if ($gameParty.gold() < this._newDepo) {
	    	SoundManager.playCancel();
	    	this.drawGold(true);
	    } else {
	    	this._bnk["balance"] = this._newDepo+this._depoGold;
	    	$gameParty.loseGold(this._newDepo); 
	    	this.processOk();
	   	}
	};

	Window_Deposit.prototype.getBank = function() { return this._bnk; };


	/* Window Withdraw */ 
	Window_Withdraw.prototype = Object.create(Window_Selectable.prototype);
	Window_Withdraw.prototype.constructor = Window_Withdraw;

	Window_Withdraw.prototype.initialize = function(x,y,w,h,bnk){
		Window_Selectable.prototype.initialize.call(this,x,y,w,h);

		this._buttons = [];
		this._bnk = bnk;
		this._depoGold = this._bnk["balance"];
		this._newWithdraw = 0;
		this._currencyUnit = TextManager.currencyUnit;
		this._width = w;
		this._height = h;
		this._x = x;
		this._y = y;
		this._max = 9999999999;

		this.createButtons();
		this.placeButtons();
	    this.updateButtonsVisiblity();
	    this.refresh();
	};

	Window_Withdraw.prototype.getBank = function() { return this._bnk; };
	Window_Withdraw.prototype.createButtons = function() {
	    var bitmap = ImageManager.loadSystem('DepoButtonSet');
	    var buttonWidth = 48;
	    var buttonHeight = 48;
	    
	    for (var i = 0; i < 5; i++) {
	        var button = new Sprite_Button();
	        var x = buttonWidth * i;
	        var w = buttonWidth * (i === 4 ? 2 : 1);
	        button.bitmap = bitmap;
	        button.setColdFrame(x, 0, w, buttonHeight);
	        button.setHotFrame(x, buttonHeight, w, buttonHeight);
	        button.visible = false;
	        button.width = w;
	        button.height = buttonHeight;
	        this._buttons.push(button);
	        this.addChild(button);
	    }

	    this._buttons[0].setClickHandler(this.onButtonUp.bind(this));
	    this._buttons[1].setClickHandler(this.onButtonUp10.bind(this));
	    this._buttons[2].setClickHandler(this.onButtonDown.bind(this));
	    this._buttons[3].setClickHandler(this.onButtonDown10.bind(this));
	    this._buttons[4].setClickHandler(this.onButtonOk.bind(this));
	};

	Window_Withdraw.prototype.placeButtons = function() {
	    var numButtons = this._buttons.length;
	    var spacing = 16;
	    var totalWidth = -spacing;

	    for (var i = 0; i < numButtons; i++) {
	        totalWidth += this._buttons[i].width + spacing;
	    }

	    var x1 = 172;
	    var x2 = 172;

	    for (var j = 0; j < numButtons; j++) {
	        var button = this._buttons[j];	    

	        if (j < 2) {
	    		button.y = (this._height - 56) - button.height;
	    		button.x = x1;
	       		x1 += button.width+3;
	    	} else {
	    		button.y = this._height - 56;
	    		button.x = x2;
	        	x2 += button.width+3;
	    	}	        
	    }
	};

	Window_Withdraw.prototype.updateButtonsVisiblity = function() {
	    if (TouchInput.date > Input.date) { this.showButtons(); }
	    else { this.hideButtons(); }
	};

	Window_Withdraw.prototype.showButtons = function() {
	    for (var i = 0; i < this._buttons.length; i++) {
	        this._buttons[i].visible = true;
	    }
	};

	Window_Withdraw.prototype.hideButtons = function() {
	    for (var i = 0; i < this._buttons.length; i++) {
	        this._buttons[i].visible = false;
	    }
	};

	Window_Withdraw.prototype.refresh = function() {
	    this.contents.clear();	    
	    this.drawGold(false);
	};

	Window_Withdraw.prototype.drawGold = function(bIsInvalid) {
	    var x = -5;
	    var y = this._height - 66;
	    var width = 150;
	    if (bIsInvalid) { this.changeTextColor(gInvalidColor); }
	    else { this.resetTextColor(); 	    }

	    this.drawText(this._newWithdraw, x, y, width, 'right');
	};

	Window_Withdraw.prototype.itemY = function() { return Math.round(this.contentsHeight() / 2 - this.lineHeight() * 1.5); };
	Window_Withdraw.prototype.buttonY = function() { return Math.round(this.priceY() + this.lineHeight() * 2.5); };
	Window_Withdraw.prototype.cursorX = function() { return 10; };
	Window_Withdraw.prototype.maxDigits = function() { return 10; };
	Window_Withdraw.prototype.update = function() {
	    Window_Selectable.prototype.update.call(this);
	    this.processGoldChange();
	};

	Window_Withdraw.prototype.isOkTriggered = function() { return Input.isTriggered('ok'); };
	Window_Withdraw.prototype.processGoldChange = function() {
	    if (this.isOpenAndActive()) {
	        if (Input.isRepeated('right')) { this.changeGold(gBtn1Value); }
	        if (Input.isRepeated('left')) { this.changeGold(-1 * gBtn1Value); }
	        if (Input.isRepeated('up')) { this.changeGold(gBtn2Value); }
	        if (Input.isRepeated('down')) { this.changeGold(-1 * gBtn2Value); }
	    }
	};

	Window_Withdraw.prototype.changeGold = function(amount) {
	    var lastGold = this._depoGold;
	    this._newWithdraw = (this._newWithdraw + amount).clamp(0, this._max);
	    if (this._depoGold-this._newWithdraw !== lastGold  || this._newWithdraw == 0) {
	        SoundManager.playCursor();
	        this.refresh();
	    }
	};

	Window_Withdraw.prototype.onButtonUp = function() { this.changeGold(gBtn1Value); };
	Window_Withdraw.prototype.onButtonUp10 = function() { this.changeGold(gBtn2Value); };
	Window_Withdraw.prototype.onButtonDown = function() { this.changeGold(-1 * gBtn1Value); };
	Window_Withdraw.prototype.onButtonDown10 = function() { this.changeGold(-1 * gBtn2Value); };

	Window_Withdraw.prototype.onButtonOk = function() {
	    if (this._bnk["balance"] < this._newWithdraw){
	    	SoundManager.playCancel();
	    	this.drawGold(true);
	    } else{
	    	//$gameBanks.setBalance(bankId,this._newWithdraw-this._depoGold);
	    	this._bnk["balance"] = this._depoGold-this._newWithdraw;
	    	$gameParty.gainGold(this._newWithdraw); 
	    	this.processOk();
	   	}
	};
	

	/* Window_BuyBond */
	Window_BuyBond.prototype = Object.create(Window_Selectable.prototype);
	Window_BuyBond.prototype.constructor = Window_BuyBond;

	Window_BuyBond.prototype.initialize = function(x,y,w,h,bnk){
		Window_Selectable.prototype.initialize.call(this,x,y,w,h);
		
		this._index = 0;
		this._selectedAction = "";
		this._bank = bnk;

		this.setup();
	};

	Window_BuyBond.prototype.setup = function(){
		var bondInfo = this._bank["bondInfo"];
		var cList = [];
		var hList = [];

		Object.keys(bondInfo).forEach(function(biId){
			cList.push(bondInfo[biId]["name"]);
			hList.push(bondInfo[biId]["helpText"]);
		});

		//Add Cancel option
		cList.push("Cancel");
		hList.push("Exit Buy Bond window.")

		this._comList = cList;
		this._helpTxtList = hList;
	};

	Window_BuyBond.prototype.updateHelp = function(){
		this._helpWindow.clear();
		this._helpWindow.setText(this._helpTxtList[this._index]);
	};

	Window_BuyBond.prototype.getHelpWindowText = function(){ return this._helpWindow._text; };
	Window_BuyBond.prototype.setSelectedBond = function (bndID){ this._selectedBond = bndID; };
	Window_BuyBond.prototype.getSelectedBond = function(){ return this._selectedBond; };
	Window_BuyBond.prototype.getHelpWindow = function() { return this._helpWindow; };
	Window_BuyBond.prototype.maxCols = function() { return 1; };
	Window_BuyBond.prototype.maxItems = function() { return this._comList ? this._comList.length : 1; };
	Window_BuyBond.prototype.itemHeight = function() { return 35; };	
	Window_BuyBond.prototype.numVisibleRows = function() { return 4; };
	Window_BuyBond.prototype.spacing = function() { return 8; };
	Window_BuyBond.prototype.drawItem = function(index) { this.drawActionItem(index,this._itmX, this._itmY, this._itmW); };
	Window_BuyBond.prototype.drawActionItem = function(index, itmX, itmY, itmW){
		this.contents.fontSize = 20;
		var rect = this.itemRectForText(index);
		var x = rect.x;
		var y = this._itmW+rect.y+rect.height/2 - this.lineHeight() * 0.5;
		var w = rect.width -x - this.textPadding();

		this.drawText(this._comList[index],rect.x,rect.y,rect.width,'left');
	};

	Window_BuyBond.prototype.processOk = function() {
		if (this._index < this._comList.length-1) {
			var selBnd = this._index;
			this.setSelectedBond(selBnd);
			Window_Selectable.prototype.processOk.call(this);
		} else {
			this.setSelectedBond(-1);
			Window_Selectable.prototype.processCancel.call(this);
		}		
	};


	/* Window_BuyBondDetails */
	Window_BuyBondDetails.prototype = Object.create(Window_Selectable.prototype);
	Window_BuyBondDetails.prototype.constructor = Window_BuyBondDetails;

	Window_BuyBondDetails.prototype.initialize = function(x,y,w,h,bnk,bnd){
		Window_Selectable.prototype.initialize.call(this,x,y,w,h);

		this._bnk = bnk;
		this._bnd = bnd;
		this._w = w;
		this._h = h;
		this._x = x;
		this._y = y;
		this._bCanBuy = false;

		this._cmds = ["Buy","Cancel"];
		this._index = -1;
	}

	Window_BuyBondDetails.prototype.getWidth = function() { return this._w; };
	Window_BuyBondDetails.prototype.getIndex = function() { return this._index; };
	Window_BuyBondDetails.prototype.getHeight = function() { return this._h; };
	Window_BuyBondDetails.prototype.maxCols = function() { return 2; };
	Window_BuyBondDetails.prototype.maxItems = function() { return this._cmds ? this._cmds.length : 1; };
	Window_BuyBondDetails.prototype.itemHeight = function() { return 35; };
	Window_BuyBondDetails.prototype.numVisibleRows = function() { return 10; };
	Window_BuyBondDetails.prototype.spacing = function() { return 5; };
	Window_BuyBondDetails.prototype.isEnabled = function(item) { return true; };
	Window_BuyBondDetails.prototype.drawItem = function(index) { this.drawCmdItem(index,this._cIX,this._cIY,this._cIW); };
	Window_BuyBondDetails.prototype.itemRect = function(index) {
	    var rect = new Rectangle();
	    rect.width = 120;
	    rect.height = 36;
	    rect.x = index == 0 ? 25:365;
	    rect.y = this.height-80;
	    return rect;
	};

	Window_BuyBondDetails.prototype.drawCmdItem = function(index,x,y,w) {		
		var rect = this.itemRectForText(index);
		this.contents.fontSize = 22;
		x = rect.x;
		y += rect.y+rect.height/2 - this.lineHeight() * 0.5;
		w = rect.width -x - this.textPadding();		

		if (this._bnd.getCost() > $gameParty.gold() && index == 0){
			this.changeTextColor(gInvalidColor);
			this._bCanBuy = false;
		} else if (this._bnd.getCost() < $gameParty.gold() && index == 0){
			this._bCanBuy = true;
			this.resetTextColor();
		} else{
			this.resetTextColor();
		}

		this.drawText(this._cmds[index],rect.x,rect.y,rect.width,'center');
		this.contents.fontSize = 24;
		this.resetTextColor();
	};

	Window_BuyBondDetails.prototype.selectLast = function() { this.select(this.index() || 0); };
	Window_BuyBondDetails.prototype.pendingIndex = function() { return this._pendingIndex; };
	Window_BuyBondDetails.prototype.setPendingIndex = function(index){
		var lstPendIndex = this._pendingIndex;
		this._pendingIndex = index;
		this.redrawItem(this._pendingIndex);
		this.redrawItem(lstPendIndex);
	};

	Window_BuyBondDetails.prototype.processOk = function() {
		if (this._index == 0) { this.callOkHandler(); }
		else if (this._index == 1) { this.callCancelHandler(); }
	};

	Window_BuyBondDetails.prototype.refresh = function() {
	    if (this.contents) {
	        this.contents.clear();

	        var x = 0;
	        var y = 0;

	        this.resetTextColor();
	        this.contents.fontSize = 24;

	        this.drawText("Bond Name: " + this._bnd.getName(),x,y,250,36,'left');
	        this.drawText("Time to Mature: " + this._bnd.getMTime(),290,y,220,36,'left');
	        this.drawText("Price: " + this._bnd.getCost(),x,y+38,235,36,'left');
	        this.drawText("Matured Value: " + this._bnd.getMValue(),290,y+38,220,36,'left');

	        this.drawAllItems();
	    }
	};


	/* Window_SellBond */
	Window_SellBond.prototype = Object.create(Window_Selectable.prototype);
	Window_SellBond.prototype.constructor = Window_SellBond;

	Window_SellBond.prototype.initialize = function(x,y,w,h,bnk) {
		Window_Selectable.prototype.initialize.call(this,x,y,w,h);

		this._comList = [];
		this._helpTxtList = [];		
		this._index = 0;
		this._selectedAction = "";
		this._bnk = bnk;
		this._bondId = -1;
		this._tmDiff = -1;

		this.setup();
	};

	Window_SellBond.prototype.setBank = function(bank) { this._bnk = bank; };
	Window_SellBond.prototype.setup = function(){
		var bank = this._bnk;
		this._comList = [];
		this._helpTxtList = [];
		var cList = [];
		var hList = [];
		var tDiff = 0;

		if (Object.keys(bank["bonds"]).length > 0){
			Object.keys(bank["bonds"]).forEach(function(bId){
				var bnd = bank["bonds"][bId];
				
				//var timeDifference = 911555200;
				cList.push(bnd["name"]);
			
				var timeDifference = getTmDiff(bnd);	

				if (timeDifference != 0){					
					tDiff = timeDifference;
					if (timeDifference < bnd["matureTime"]) { hList.push("This bond will mature in " + (bnd["matureTime"] - timeDifference) + " hours."); }
					else { hList.push("This bond has matured.") }
				} else{
					hList.push("This bond will mature in " + bnd["matureTime"] + " hours.");
				}

			});
		}

		if (cList.length > 0){
			for (var i1 = 0; i1 < cList.length; i1++){
				this._comList.push(cList[i1]);
				this._helpTxtList.push(hList[i1]);
			}
		}

		this._tmDiff = tDiff;

		this._comList.push("Cancel");
		this._helpTxtList.push("Exit Sell Bond window");
		this.refresh();
	};

	function getTmDiff(bnd){
		var tUnit = bank["timeUnit"];
		var dateNow = Date.now();
		var tDiff = bnd["purchaseDate"] == Date.parse('0') ? Date.parse('0'):dateNow-bnd["purchaseDate"];

		if (tUnit == "Hours"){ return Math.floor((tDiff/1000)/60/60); }
		else if (tUnit == "Seconds") { return Math.floor((tDiff/1000)); }
		else if (bankTUnit == "Minutes") { return Math.floor((tDiff/1000)/60); }
	    else if (bankTUnit == "Days") { return Math.floor((tDiff/1000)/60/60/24); }
	}

	Window_SellBond.prototype.drawItem = function(index) {
	    var rect = this.itemRectForText(index);
	    var align = this.itemTextAlign();
	    
	    this.changePaintOpacity(this.isCommandEnabled(index));
	    this.drawText(this.commandName(index), rect.x, rect.y, rect.width, align);
	};

	Window_SellBond.prototype.getBond = function(bndName) {
		var bank = this._bnk;
		var bond = {};
		if (Object.keys(bank["bonds"]).length > 0){
			Object.keys(bank["bonds"]).forEach(function(bId){
				if (bank["bonds"][bId]["name"] == bndName){
					bond = bank["bonds"][bId];

					return;
				}
			});
		}

		return bond;
	};

	Window_SellBond.prototype.getBondId = function() { return this._bondId; };
	Window_SellBond.prototype.updateHelp = function(){
		this._helpWindow.clear();
		this._helpWindow.setText(this._helpTxtList[this._index]);
	};

	Window_SellBond.prototype.getHelpWindowText = function() { return this._helpWindow._text; };
	Window_SellBond.prototype.setSelectedAction = function (selAct) { this._selectedAction = selAct; };
	Window_SellBond.prototype.getSelectedAction = function() { return this._selectedAction; };
	Window_SellBond.prototype.getHelpWindow = function() { return this._helpWindow; };
	Window_SellBond.prototype.maxCols = function() { return 1; };
	Window_SellBond.prototype.maxItems = function() { return this._comList ? this._comList.length : 1; };
	Window_SellBond.prototype.itemHeight = function() { return 35; };	
	Window_SellBond.prototype.numVisibleRows = function() { return 4; };
	Window_SellBond.prototype.spacing = function() { return 8; };
	Window_SellBond.prototype.drawItem = function(index) { this.drawActionItem(index,this._itmX, this._itmY, this._itmW); };
	Window_SellBond.prototype.drawActionItem = function(index, itmX, itmY, itmW){
		this.contents.fontSize = 20;
		var rect = this.itemRectForText(index);
		var x = rect.x;
		var y = this._itmW+rect.y+rect.height/2 - this.lineHeight() * 0.5;
		var w = rect.width -x - this.textPadding();

		var bnd = this.getBond(this._comList[index]);

	    if (bnd){			
			if (getTmDiff(bnd) < bnd["matureTime"]) { this.changeTextColor(bImmatureColor); }
			else { this.resetTextColor(); }
	    } else{
	    	this.resetTextColor();
	    }

		this.drawText(this._comList[index],rect.x,rect.y,rect.width,'left');
	};

	Window_SellBond.prototype.processOk = function(){

		if (this._comList[this._index] == "Cancel"){
			Window_Selectable.prototype.processCancel.call(this);
		} else{
			var bnd = this.getBond(this._comList[this._index]);

			if (getTmDiff(bnd) > this.getBond(this._comList[this._index])["matureTime"]){
				var selAct = this._comList[this._index];
				this.setSelectedAction(selAct);
				Window_Selectable.prototype.processOk.call(this);
			} else{
				SoundManager.playCancel();
			}
		}
	};


	/* Window_SellBondDetails */
	Window_SellBondDetails.prototype = Object.create(Window_Selectable.prototype);
	Window_SellBondDetails.prototype.constructor = Window_SellBondDetails;

	Window_SellBondDetails.prototype.initialize = function(x,y,w,h,bnk,bnd){
		Window_Selectable.prototype.initialize.call(this,x,y,w,h);

		this._bnk = bnk;
		this._bnd = bnd;
		this._w = w;
		this._h = h;
		this._x = x;
		this._y = y;

		this._cmds = ["Sell","Cancel"];
		this._index = -1;
	};

	Window_SellBondDetails.prototype.getWidth = function() { return this._w; };
	Window_SellBondDetails.prototype.getIndex = function() { return this._index; };
	Window_SellBondDetails.prototype.getHeight = function() { return this._h; };
	Window_SellBondDetails.prototype.maxCols = function() { return 2; };
	Window_SellBondDetails.prototype.maxItems = function() { return this._cmds ? this._cmds.length : 1; };
	Window_SellBondDetails.prototype.itemHeight = function() { return 35; };
	Window_SellBondDetails.prototype.numVisibleRows = function() { return 10; };
	Window_SellBondDetails.prototype.spacing = function() { return 5; };
	Window_SellBondDetails.prototype.isEnabled = function(item) { return true; };
	Window_SellBondDetails.prototype.drawItem = function(index) { this.drawCmdItem(index,this._cIX,this._cIY,this._cIW); };
	Window_SellBondDetails.prototype.itemRect = function(index) {
	    var rect = new Rectangle();
	    rect.width = 120;
	    rect.height = 36;
	    rect.x = index == 0 ? 25:365;
	    rect.y = this.height-80;
	    return rect;
	};

	Window_SellBondDetails.prototype.drawCmdItem = function(index,x,y,w){		
		var rect = this.itemRectForText(index);
		this.contents.fontSize = 22;
		x = rect.x;
		y += rect.y+rect.height/2 - this.lineHeight() * 0.5;
		w = rect.width -x - this.textPadding();

		this.resetTextColor();
		this.drawText(this._cmds[index],rect.x,rect.y,rect.width,'center');
		this.contents.fontSize = 24;
	};

	Window_SellBondDetails.prototype.selectLast = function() { this.select(this.index() || 0); };
	Window_SellBondDetails.prototype.pendingIndex = function() { return this._pendingIndex; };
	Window_SellBondDetails.prototype.setPendingIndex = function(index){
		var lstPendIndex = this._pendingIndex;
		this._pendingIndex = index;
		this.redrawItem(this._pendingIndex);
		this.redrawItem(lstPendIndex);
	}

	Window_SellBondDetails.prototype.processOk = function(){
		if (this._index == 0) { this.callOkHandler(); }
		else if (this._index == 1) { this.callCancelHandler(); }
	};

	Window_SellBondDetails.prototype.refresh = function() {
	    if (this.contents) {
	        this.contents.clear();

	        var x = 0;
	        var y = 0;

	        this.resetTextColor();
	        this.contents.fontSize = 24;

	        this.drawText("Bond Name: " + this._bnd["name"],x,y,250,36,'left');
	        this.drawText("Time to Mature: " + this._bnd["matureTime"],290,y,220,36,'left');
	        this.drawText("Price: " + this._bnd["cost"],x,y+38,235,36,'left');
	        this.drawText("Matured Value: " + this._bnd["maturedValue"],290,y+38,220,36,'left');
	        this.drawAllItems();
	    }
	};


	/* Window_BankDetails */
	Window_BankDetails.prototype = Object.create(Window_Status.prototype);
	Window_BankDetails.prototype.constructor = Window_BankDetails;

	Window_BankDetails.prototype.initialize = function(x,y,w,h,bnk){
		Window_Selectable.prototype.initialize.call(this,x,y,w,h);

		this._width = w;
		this._height = h;
		this._x = x;
		this._y = y;

		this._bnk = bnk;

		//this.drawDetails();
		this.refresh();
	};

	Window_BankDetails.prototype.drawDetails = function() {
		var x = 0;
		var y = 0;
		this.resetTextColor();
		this.drawText("This is a test",x,y,100,36,'left');
	};

	Window_BankDetails.prototype.refresh = function() {
		this.contents.clear();
		var x = 0;
		var y = 0;
		this.resetTextColor();
		this.drawText("Current Gold: " + $gameParty.gold(),x,y,210,36*1,'left');
		this.drawText("Interest Rate: " + this._bnk["interest"],x,y+(38*1),210,36,'left');
		this.drawText("Balance: " + this._bnk["balance"],x,y+(38*2),210,36*1,'left');
		this.drawText("Bonds: " + Object.keys(this._bnk["bonds"]).length,x,y+(38*3),210,36*1,'left');
		//this.drawText("Stock Shares: 100",x,y+(38*4),210,36*1,'left');
	};

	Window_BankDetails.prototype.setBank = function(bank) { this._bnk = bank; };

	//Game_Party
})();

