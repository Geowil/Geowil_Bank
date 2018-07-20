# Geowil_Bank Plugin
Version: 1.0.1

Demo Available: Yes, [Geowil_BankDemo.zip](http://lmpgames.com/RMMV/Plugins/Geowil_BankDemo_V1.1.1.zip)

Project Available: Yes, [Geowil_BankProject.zip](http://lmpgames.com/RMMV/Plugins/Geowil_BankDemo_ProjectV1.1.1.zip)

Conflicts: Maybe, see [Conflicts](https://github.com/Geowil/Geowil_Bank#conflicts) section

Terms of Use: Free non-commercially or commercially; just give credit

<p align="center"> 
    <img src="http://i15.photobucket.com/albums/a367/Geowil/bankDemo1_zps1yppk5sc.png"/>
</p>


## What is this?
This repository is for an RPG Maker MV JS plugin which allows the developer to create a banking system within their game.


## Installation Instructions
First download all three files from this repository.  I have renamed the rpg_managers.js and rpg_objects.js files so that
you will not overwrite your existing files.  There are changes in these files you must add to your existing files of the
same name.

In rpg_objects_.js you will need to find the Game_Banks class at the bottom of the file and copy/paste it into your
rpg_objects.js file.

In rpg_managers_.js the changes you will need to copy over to rpg_managers.js can be found by searching for '//For Geowil_BankPlugin'.
Copy these to approximatly the same locations in your rpg_managers.js file.

I will try to make future versions not require these first steps.

Lastly just drop the Geowil_Bank.js file into your plugins folder and add the plugin to your project.



## How does it work?
It is very simple to use.  First you may want to modify some of the plugin settings to set things like if
bonds are enabled and the denomination of time to use (Ie. hours, minutes, days).  Next, if you do not enable
bonds, all you have to do is put plugin commands into events where you want to access the bank(s) from.  You can
use the same bank across your entire game or have each major location have its own.

The plugin commands to open the bank are as follows:

```
BankOpen <BankID> <InterestRate>
BankOpen <BankID> <InterestRate> <TimeDenomination>
```

where <BankID> is the ID for the bank you want to open and <InterestRate> is the interest rate for that bank.
Future version of the plugin may either remove the InterestRate parameter or add a second BankOpen command that
does not use it so that you can modify this value through a plugin command.

The <TimeDenomination> option on the second command specifies what unit of time interest is compiled at or bond
matures at.  Valid values are Second, Minutes, Hours, or Days.  All other input will be ignored.  This option does not
change your bond help text messages to reflect the change in time unit so be sure to update any bonds if you already added them.



## Current Features Overview
### Features in V1.0
- Deposit Gold
    - Players are able to deposit gold into the bank.  If an interest rate is set then over the specified amount of time
    units (example hours) that interest rate will be comounded onto the deposited gold. As an example a deposit of
    100 gold at a hand with an hourly interest rate of 10% would generate 10 extra gold over 1 hour.  If the player returned
    to that bank after an hour, they will find 110 gold available for withdrawal.
- Withdraw Gold
    - Players can withdraw any gold they have stored at a bank.
- Bonds
    - Bonds are another way to allow a player to grow their gold through this plugin.  The player buys a bond and then after
    a set amount of time the bond matures and can be sold for a greater value.  The system can be turned on or off from the
    plugin settings or through a plugin command.


### Parameters
There are a total of six plugin parameters to customize the plugin with.  I will list them and their functions.

- Invalid Gold Color
    - Changes the text color on the gold counter when the user attempts to withdraw or deposit more gold that is available.
- Invalid Bond Color
    - Changes the text color in the Sell Bond selection window for bonds which have not yet matured.
- Gold Counter Button 1 Value
    - Sets the value for the single arrow up/down buttons in the gold counter window when depositing or withdrawing
    gold as well as the value of the left/right keyboard arrow keys.
- Gold Counter Button 2 Value
    - Sets the value for the double arrow up/down buttons in the gold counter window when depositing or withdrawing gold
    as well as the value of the up/down keyboard arrow keys.
- Add Bond Overwrites
    - Determines if, when adding a bond to a bank, the add bond plugin command will overwrite an existing bond.  Some important
    notes on this in the AddBond plugin command section.
- Bond System Active
    - Sets the default state of the bond system for each bank when they are created.  Use BondSystemEnabled plugin
    command to enable/disable on a per-bank basis.
- Time Denomination
    - Sets the default time unit setting for all banks.  Use the ChangeTimeUnit plugin command to alter this setting on
    a per-bank basis.


###Plugin Commands
I have already gone over a few of these but I will include them again here.

#### Opening Banks
The very first commands you should know about are used to open a bank.  These will also create the bank if they do not
already exist or update certain values if the bank does exist and they are different.

```
BankOpen <BankID> <InterestRate>
BankOpen <BankID> <InterestRate> <TimeDenomination>

Examples:
BankOpen 0 10
BankOpen 1 15 Minutes
```

The first BankOpen command simply opens a bank with the specified id and with the specified interest rate.  The second one
will change the default time denomination setting from 'Time Denomination' in the plugin settings to whatever you enter
for the <TimeDenomination> option.


#### Adding/Updating Bonds
The next plugin command allows you to create a new bond at the specifid bank:

```
Bank <BankID> AddBond <BondInfoID> <Bond Name> <Bond Cost> <Bond Matured Value> <Bond Mature Time> <Bond Help Text>
```
Here is a breakdown of what the options are used for:

<BankID> - ID for the bank the bond should be added to.
<BondInfoID> - ID for the bond info record at that bank, this ID can be used to later update this specific record.
<Bond Name> - The name for the bond that will show up in the 'Buy Bond' selection list.
<Bond Cost> - How much it will cost the player to buy the bond.
<Bond Matured Value> - How much the player will be able to sell the bond for once it has fully matured.
<Bond Mature Time> - The amount of time it will take for the bond to fully mature.
<Bond Help Text> - Sets the help text that will be displayed for the bond in the 'Buy Bond' window.

```
Example: Bank 0 AddBond 0 Baisc Bond 10 1000 4000 10 This bond will mature after 10 hours.\nGains 20% interest at maturation.
```

The above example create a new bond information record for bank 0 with the specified values.
If you want to update an existing bond at a bank use the below plugin command:

```
Bank <BankID> UpdateBond <BondInfoID> <Bond Name> <Bond Cost> <Bond Matured Value> <Bond Mature Time> <Bond Help Text>

Example: Bank 0 UpdateBond 0 Baisc Bond 10 2000 8000 10 This bond will mature after 10 hours.\nGains 20% interest at maturation.
```

The above example modified the bond information record we created with the AddBond example at bank 0.


#### Changing the Time Denomination
The next plugin command allows you to modify the time denomination at a specified bank:

```
Bank <BankID> ChangeTimeUnit <TimeUnit>

Example: Bank 0 ChangeTimeUnit Days
```

Valid input for the <TimeUnit> option are as follows: Seconds, Minutes, Hours, or Days


#### Toggle the Bond System
The next plugin command allows you to turn the bond system on or off at the specified bank:

```
Bank <BankID> BondSystemEnabled 0/1

Example: Bank 2 BondSystemEnabled 0
```

In the example we have disabled the bond system at bank 2.


#### Altering the Behavior of AddBond
This plugin command allows you to change how AddBond works.  When used it will make AddBond overwrite any
existing bond with the same BondInfoID at any bank you specify.  This is a global setting change so you will
need to call the opposite option to disable it to return AddBond to the normal behavior of ignoring existing
bonds.

```
Bank AddOverwrites On/Off

Example: Bank AddOverwrites Off
```



## Planned Features
- Third BankOpen command with no additional options
- A plugin command to adjust the interest rate
- Stocks


## Conflicts
Right know there are no known conflicts however anything that aliases or modifies the following functions may
conflict with this plugin without proper integration measures:

- DataManager.createGameObjects
- DataManager.createSaveContents
- DataManager.extractSaveContents
- Game_Interpreter.prototype.pluginCommand


## Version Changelogs
- Version 1.1.1 Changelog:
  - Fixed an issue where some plugin parameters might not have been working properly.

- Version 1.0.1 Changelog:
  - Fixed an issue with the demo that caused the custom gold changer buttons to not render.
  
- Version 1.0.0 Changelog:
  - Initial version of plugin uploaded?
