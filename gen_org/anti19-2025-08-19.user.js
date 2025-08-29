// ==UserScript==
// @name         anti19
// @namespace    http://tampermonkey.net/
// @version      2025-08-19
// @description  be a better man
// @author       mx
// @match        https://*.generals.io/*
// @grant        none
// @require      https://cdn.rawgit.com/pasghetti/wshook/master/wsHook.js
// @run-at       document-start
// ==/UserScript==

var chatRoom = "";
var lossEnding = 'lose';
var winEnding = 'win';
var antiArmy = 17;

const firstArmyTurn = {};
let mes2send = {};

function checkLeaderboard() {
    const leaderboard = document.querySelector('#game-leaderboard');
    if(!leaderboard) {
        firstArmyTurn = {};
        mes2send = {};
        return; // 没有加载好
    }

    const rows = Array.from(leaderboard.querySelectorAll('tr'));
    if(rows.length < 2) return;

    const headerCells = Array.from(rows[0].children);
    let nameIdx = -1, armyIdx = -1, landIdx = -1;
    headerCells.forEach((cell, i) => {
        const t = cell.textContent.trim().toLowerCase();
        if(t.includes("player") || t.includes("name")) nameIdx = i;
        if(t.includes("army")) armyIdx = i;
        if(t.includes("land") || t.includes("tiles")) landIdx = i;
    });

    if(nameIdx === -1 || armyIdx === -1 || landIdx === -1) {
        return;
    }

    rows.slice(1).forEach(row => {
        const cells = row.children;
        const name = cells[nameIdx]?.textContent.trim();
        const army = Number(cells[armyIdx]?.textContent) || 0;
        const land = Number(cells[landIdx]?.textContent) || 0;

        // 第一次出兵条件：land >= 3
        if(land === 3 && !firstArmyTurn[name]) {
            firstArmyTurn[name] = army - 1;
            if (army > antiArmy){
                mes2send[name] = true
            }
        }

    });
}

wsHook.after = function(messageEvent, url, wsObject) {
	if(messageEvent.data.indexOf("42[\"game_start\",") == 0) {
		var check = messageEvent.data.indexOf(",{\"playerIndex\":") + ",{\"playerIndex\":".length;
		if(messageEvent.data.substr(check, 1) === "-") {
			return messageEvent;
		}
		var start = messageEvent.data.indexOf(",\"chat_room") + ",\"chat_room".length + 3;
		var end = messageEvent.data.indexOf(",\"team_chat_room") - 1;
		if(end < 0) {
			end = messageEvent.data.indexOf(",\"usernames") - 1;
		}
		chatRoom = messageEvent.data.substr(start, end - start);
	}
	if(chatRoom !== "" && messageEvent.data.indexOf("42[\"game_update\",") == 0) {
		var start = messageEvent.data.indexOf(",\"turn") + ",\"turn".length + 2;
		var end = messageEvent.data.indexOf(",\"attackIndex");
		var curTurn = +messageEvent.data.substr(start, end - start);

        checkLeaderboard();
        for (const key in firstArmyTurn) {
            if(mes2send[key] === true){
                let msg = ` ${key} uses ${firstArmyTurn[key]} start!`
                if(firstArmyTurn[key] === 19){
                    msg += ' Is that so hard to be NICE?'
                }else{
                    msg += ' Condemn!!'
                }
                wsObject.send("42[\"chat_message\",\"" + chatRoom + "\",\"" + msg + "\",\"\"]");
                mes2send[key] = false;
            }
		}
	}
	if(chatRoom !== "" && messageEvent.data.indexOf("game_lost") != -1) {
		chatRoom = "";
	}
	if(chatRoom !== "" && messageEvent.data.indexOf("game_won") != -1) {
		chatRoom = "";
	}
    return messageEvent;
}

var minimized = false;

function checkChat() {
	var log = document.getElementsByClassName("chat-messages-container");
	var leaderboard = document.getElementById("game-leaderboard");
	if(leaderboard) {
		if(!minimized && log.length > 0 && !log[0].classList.contains("minimized") && chatRoom !== "") {
			minimized = true;
			log[0].click();
		}
	} else {
		minimized = false;
	}
}

setInterval(checkChat, 100);