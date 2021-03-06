//map format
//n,m,turn
//grid_type[n][m] byte 0~49=army 50~99=city 100~149=generals 150~199=swamp with army 200=empty 201=mountain 202=fog 203=obstacle 204=swamp 205=swamp+fog
//army_cnt[n][m] int

$(document).ready(function(){
	x=-1,y=-1;
	$('body').on('mousedown',function(e){
		x=e.pageX,y=e.pageY;
	});
	$('body').on('mousemove',function(e){
		var w,X,Y;
		if(typeof(e.originalEvent.buttons)=="undefined"){
			w=e.which;
		}else{
			w=e.originalEvent.buttons;
		}
		X=e.clientX||e.originalEvent.clientX;
		Y=e.clientY||e.originalEvent.clientY;
		if(w==1){
			$('#map').css('left',parseInt($('#map').css('left'))-x+X);
			$('#map').css('top',parseInt($('#map').css('top'))-y+Y);
			x=e.pageX,y=e.pageY;
		}
	});
});

function htmlescape(x){
	return $('<div>').text(x).html();
}

var dire=[{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1}];
var dire_char=['↑','↓','←','→'];
var dire_class=['arrow_u','arrow_d','arrow_l','arrow_r'];

var n,m,turn,player,scale,selx,sely,selt,in_game=false;
var grid_type,army_cnt,have_route=Array(4);
var route;

var room_id='',client_id,ready_state=0,lost;
var max_teams=9;

var chat_focus=false,is_team=false;

function init_map(_n,_m){
	chat_focus=false;
	$('#chatroom-input').blur();
	n=_n,m=_m;
	grid_type=Array(n);
	for(var i=0;i<n;i++){
		grid_type[i]=Array(m);
	}
	army_cnt=Array(n);
	for(var i=0;i<n;i++){
		army_cnt[i]=Array(m);
	}
	for(var d=0;d<4;d++){
		have_route[d]=Array(n);
		for(var i=0;i<n;i++){
			have_route[d][i]=Array(m);
		}
	}
	route=Array();
	selx=-1,sely=-1;
	
	var ts="";
	for(var i=0;i<n;i++){
		ts+='<tr>';
		for(var j=0;j<m;j++){
			ts+='<td id="t'+i+'_'+j+'"></td>';
		}
		ts+='</tr>';
	}
	$('#map').html('<table><tbody>'+ts+'</table></tbody>');
	$('#map').css('left',$(document).width()/2+'px');
	$('#map').css('top',$(document).height()/2+'px');
	for(var i=0;i<n;i++){
		for(var j=0;j<m;j++){
			$('#t'+i+'_'+j).on('click',Function("click("+i+","+j+")"));
		}
	}
}

function click(x,y,q){
	if(typeof(q)=="undefined")q=true;
	if(x<0||y<0||x>=n||y>=m)return;
	if(x==selx&&y==sely){
		if(selt==1){
			selt=2;
		}else{
			selx=sely=-1;
		}
	}else if(Math.abs(x-selx)+Math.abs(y-sely)==1&&grid_type[x][y]!=201){
		var d=0;
		for(;selx+dire[d].x!=x||sely+dire[d].y!=y;d++);
		addroute(selx,sely,d,selt);
		selx=x,sely=y,selt=1;
	}else if(grid_type[x][y]<200&&grid_type[x][y]%50==player){
		selx=x,sely=y,selt=1;
	}else if(q){
		selx=-1,sely=-1;
	}
	render();
}

function keypress(key){
	if(in_game){
		if(key=='z'){
			selt=3-selt;
			render();
		}else if(key=='w'||key==38){
			click(selx-1,sely,false);
		}else if(key=='s'||key==40){
			click(selx+1,sely,false);
		}else if(key=='a'||key==37){
			click(selx,sely-1,false);
		}else if(key=='d'||key==39){
			click(selx,sely+1,false);
		}else if(key=='q'){
			clear_queue();
		}else if(key=='e'){
			pop_queue();
		}else if(key=='t'){
			if(!chat_focus){
				is_team=true;
				setTimeout(function(){
					$('#chatroom-input').focus();
					checkChat();
				},0);
			}
		}else if(key==13){
			if(!chat_focus){
				is_team=false;
				setTimeout(function(){
					$('#chatroom-input').focus();
					checkChat();
				},0);
			}
		}else if(key==' '){
			selx=-1,sely=-1;
			render();
		}
	}
}

$(document).ready(function(){
	$('body').on('keypress',function(e){
		keypress(e.key.toLowerCase());
	});
	$('body').on('keydown',function(e){
		keypress(e.keyCode);
	});
	$('#map_back').on('click',function(e){
		selx=-1,sely=-1;
		render();
	});
	$('body').bind('mousewheel',function(e){
		if(in_game){
			if(e.originalEvent.deltaY>0){
				scale=Math.max(scale-1,1);
			}else{
				scale=Math.min(scale+1,6);
			}
			if(typeof(localStorage)!="undefined"){
				localStorage.scale=scale.toString();
			}
			render();
		}
	})
	if(typeof(localStorage)!="undefined"){
		if(typeof(localStorage.scale)=="undefined"){
			localStorage.scale='3';
		}
		scale=parseInt(localStorage.scale);
	}
});

function render(){
	$('#menu').css('display','none');
	$('#game').css('display','');
	for(var d=0;d<4;d++){
		for(var i=0;i<n;i++){
			for(var j=0;j<m;j++){
				have_route[d][i][j]=false;
			}
		}
	}
	for(var i=0;i<route.length;i++){
		have_route[route[i].d][route[i].x][route[i].y]=true;
	}
	for(var i=0;i<n;i++){
		for(var j=0;j<m;j++){
			var cls='s'+scale,txt='';
			if(grid_type[i][j]<200){
				if(grid_type[i][j]<50){
					cls+=' c'+grid_type[i][j];
				}else if(grid_type[i][j]<100){
					cls+=' c'+(grid_type[i][j]-50)+' city';
				}else if(grid_type[i][j]<150){
					cls+=' c'+(grid_type[i][j]-100)+' general';
				}else if(grid_type[i][j]<200){
					cls+=' c'+(grid_type[i][j]-150)+' swamp';
				}
				if(grid_type[i][j]%50==player){
					cls+=' selectable';
				}
				if(army_cnt[i][j]||grid_type[i][j]==50)txt=army_cnt[i][j];
			}else if(grid_type[i][j]==200){
				cls+=' empty';
			}else if(grid_type[i][j]==201){
				cls+=' mountain empty';
			}else if(grid_type[i][j]==202){
				cls+=' fog';
			}else if(grid_type[i][j]==203){
				cls+=' obstacle fog';
			}else if(grid_type[i][j]==204){
				cls+=' swamp';
			}else if(grid_type[i][j]==205){
				cls+=' swamp fog';
			}
			if(i==selx&&j==sely){
				if(selt==1){
					cls+=' selected';
				}else{
					cls+=' selected selected50';
					txt='50%';
				}
			}else if(Math.abs(i-selx)+Math.abs(j-sely)==1&&grid_type[i][j]!=201){
				cls+=' attackable';
			}
			for(var d=0;d<4;d++)if(have_route[d][i][j]){
				txt+='<div class="'+dire_class[d]+'">'+dire_char[d]+'</div>';
			}
			if($('#t'+i+'_'+j).attr('class')!=cls){
				$('#t'+i+'_'+j).attr('class',cls);
			}
			if($('#t'+i+'_'+j).html()!=txt){
				$('#t'+i+'_'+j).html(txt);
			}
		}
	}
}

var socket=io.connect(location.origin,{transports:['websocket','polling']});

socket.on('update',function(data){
	if(data.is_diff){
		for(var i=0;i*2<data.grid_type.length;i++){
			var t=data.grid_type[i*2];
			grid_type[parseInt(t/m)][t%m]=data.grid_type[i*2+1];
		}
		for(var i=0;i*2<data.army_cnt.length;i++){
			var t=data.army_cnt[i*2];
			army_cnt[parseInt(t/m)][t%m]=data.army_cnt[i*2+1];
		}
	}else{
		for(var i=0,t=0;i<n;i++){
			for(var j=0;j<m;j++){
				grid_type[i][j]=data.grid_type[t++];
			}
		}
		for(var i=0,t=0;i<n;i++){
			for(var j=0;j<m;j++){
				army_cnt[i][j]=data.army_cnt[t++];
			}
		}
	}
	if(route.length){
		if(data.lst_move.x!=-1){
			while(route.length){
				var t1=data.lst_move,t2={x:route[0].x,y:route[0].y,dx:route[0].x+dire[route[0].d].x,dy:route[0].y+dire[route[0].d].y,half:route[0].type==2};
				route=route.splice(1);
				if(t1.x==t2.x&&t1.y==t2.y&&t1.dx==t2.dx&&t1.dy==t2.dy&&t1.half==t2.half)break;
			}
		}else{
			while(route.length){
				var x=route[0].x,y=route[0].y,dx=route[0].x+dire[route[0].d].x,dy=route[0].y+dire[route[0].d].y;
				if(grid_type[x][y]<200&&grid_type[x][y]%50==player&&army_cnt[x][y]>1&&grid_type[dx][dy]!=201)break;
				route=route.splice(1);
			}
		}
	}
	render();
	lb=data.leaderboard.sort(function(a,b){
		if(a.army!=b.army)return a.army>b.army?-1:1;
		if(a.land!=b.land)return a.land>b.land?-1:1;
		return 0;
	})
	var th='<tr><td>Team</td><td>Player</td><td>Army</td><td>Land</td></tr>';
	for(var i=0;i<lb.length;i++){
		th+='<tr class="'+lb[i].class_+'"><td>'+lb[i].team+'</td><td class="leaderboard-name c'+lb[i].id+'">'+htmlescape(lb[i].uid)+'</td><td>'+lb[i].army+'</td><td>'+lb[i].land+'</td></tr>';
	}
	$('#game-leaderboard').html(th);
	$('#game-leaderboard').css('display','');
	$('#turn-counter').html('Turn '+Math.floor((data.turn+2)/2));
	$('#turn-counter').css('display','');
	if(typeof(data.kills[client_id])!='undefined'){
		$($('#status-alert').children()[0].children[0]).html('Game Over');
		$($('#status-alert').children()[0].children[1]).html('<span>You were defeated by <span style="font-family: Quicksand-Bold;">'+htmlescape(data.kills[client_id])+'</span>.</span>');
		$($('#status-alert').children()[0].children[1]).css('display','');
		$($('#status-alert').children()[0].children[2]).css('display','');
		$('#status-alert').css('display','');
		lost=true;
	}
	if(data.game_end){
		if($('#status-alert').css('display')=='none'){
			if(lost){
				$($('#status-alert').children()[0].children[0]).html('Game Ended');
			}else{
				$($('#status-alert').children()[0].children[0]).html('You Win');
			}
			$($('#status-alert').children()[0].children[1]).css('display','none');
		}
		$('#status-alert').css('display','');
		$($('#status-alert').children()[0].children[2]).css('display','none');
	}
});

function addroute(x,y,d,type){
	route.push({x:x,y:y,d:d,type:type});
	socket.emit('attack',{x:x,y:y,dx:x+dire[d].x,dy:y+dire[d].y,half:type==2});
	render();
}

function clear_queue(){
	route=Array()
	socket.emit('clear_queue');
	render();
}

function pop_queue(){
	if(route.length){
		var tmp=route.pop();
		socket.emit('pop_queue');
		if(tmp.x+dire[tmp.d].x==selx&&tmp.y+dire[tmp.d].y==sely){
			selx=tmp.x,sely=tmp.y;
		}
		render();
	}
}

socket.on('set_id',function(data){
	client_id=data;
});

socket.on('init_map',function(data){
	init_map(data.n,data.m);
	in_game=true;
	lost=false;
	for(var i=0;i<data.player_ids.length;i++){
		if(data.player_ids[i]==client_id){
			player=i+1;
		}
	}
});

$(document).ready(function(){
	$('#menu').css('display','');
	if(typeof(localStorage)!="undefined"){
		if(typeof(localStorage.username)=="undefined"){
			localStorage.username='Anonymous';
		}
		nickname=localStorage.username;
	}else{
		nickname='Anonymous';
	}
	var tmp=location.pathname;
	room_id=tmp.substr(tmp.indexOf('games/')+6);
	socket.emit('join_game_room',{'room':room_id,'nickname':nickname});
});

socket.on('connect',function(){
	if(room_id!=''){
		socket.emit('join_game_room',{'room':room_id,'nickname':nickname});
	}
});

socket.on('room_update',function(data){
	setRangeVal('map-height',data.height_ratio);
	setRangeVal('map-width',data.width_ratio);
	setRangeVal('city-density',data.city_ratio);
	setRangeVal('mountain-density',data.mountain_ratio);
	setRangeVal('swamp-density',data.swamp_ratio);
	setTabVal('game-speed',data.speed+'x');
	$('#custom-map').val(data.custom_map);
	var tmp=Array(max_teams+1);
	for(var i=0;i<=max_teams;i++){
		tmp[i]='';
	}
	$('#host-'+(data.players[0].sid==client_id).toString()).css('display','');
	$('#host-'+(data.players[0].sid!=client_id).toString()).css('display','none');
	for(var i=0;i<data.players.length;i++){
		if(data.players[i].sid==client_id){
			setTabVal('custom-team',data.players[i].team?data.players[i].team.toString():'Spectator');
			if(data.players[i].team){
				$('#you-are').css('display','');
				$($('#you-are')[0].children[1]).attr('class','inline-color-block c'+(i+1));
			}else{
				$('#you-are').css('display','none');
			}
			if(data.players[i].uid=='Anonymous'){
				$('#username-input').val('');
			}else{
				$('#username-input').val(data.players[i].uid);
			}
		}
		if(data.players[i].team){
			tmp[data.players[i].team]+='<div><span class="inline-color-block c'+(i+1)+'"></span><p>'+htmlescape(data.players[i].uid)+'</p></div>';
		}else{
			tmp[data.players[i].team]+='<div><p>'+htmlescape(data.players[i].uid)+'</p></div>';
		}
	}
	for(var i=0;i<=max_teams;i++){
		if(tmp[i]!=''){
			tmp[i]='<div class="custom-team-container"><h4>'+(i?'Team '+i:'Spectators')+'</h4>'+tmp[i]+'</div>';
		}
	}
	var res_html='';
	for(var i=1;i<=max_teams;i++){
		res_html+=tmp[i];
	}
	res_html+=tmp[0];
	$('#teams').html(res_html);
	if(data.need>1){
		$('#force-start').css('display','block');
		$('#force-start').html('Force Start '+data.ready+' / '+data.need);
	}else{
		$('#force-start').css('display','none');
	}
	if(ready_state){
		$('#force-start').attr('class','inverted');
	}else{
		$('#force-start').attr('class','');
	}
});

function getConf(){
	var data={};
	data.height_ratio=getRangeVal('map-height');
	data.width_ratio=getRangeVal('map-width');
	data.city_ratio=getRangeVal('city-density');
	data.mountain_ratio=getRangeVal('mountain-density');
	data.swamp_ratio=getRangeVal('swamp-density');
	data.speed=parseFloat(getTabVal('game-speed'));
	data.custom_map=$('#custom-map').val();
	return data;
}

function updateConf(){
	socket.emit('change_game_conf',getConf());
}

function updateTeam(){
	var team=getTabVal('custom-team');
	if(team=='Spectator')team=0;
	socket.emit('change_team',{team:team});
}

function getRangeVal(x){
	return $($('#'+x)[0].children[0]).val();
}

function setRangeVal(x,y){
	$($('#'+x)[0].children[0]).val(y);
	$($('#'+x)[0].children[1]).html($($('#'+x)[0].children[0]).val());
}

function initRange(x){
	$(x.children[0]).on('change',function(){
		$(x.children[1]).html($(x.children[0]).val())
		updateConf();
	});
	$(x.children[0]).on('input',function(){
		$(x.children[1]).html($(x.children[0]).val());
		updateConf();
	});
}

function getTabVal(x){
	return $($('#tabs-'+x)[0].children[0]).val();
}

function setTabVal(x,y){
	var tmp=getTabVal(x),tabs=$('#tabs-'+x)[0].children;
	for(var i=1;i<tabs.length;i++){
		if($(tabs[i]).html()==tmp){
			$(tabs[i]).attr('class','inline-button');
		}
		if($(tabs[i]).html()==y){
			$(tabs[i]).attr('class','inline-button inverted');
		}
	}
	$($('#tabs-'+x)[0].children[0]).val(y);
}

function initTab(x,y,callback){
	$(y).on('click',function(){
		setTabVal($(x).attr('id').substr(5),$(y).html());
		callback();
	});
}

$(document).ready(function(){
	$('.slider-container').each(function(){initRange(this)});
	$('#tabs-game-speed').each(function(){
		for(var i=1;i<this.children.length;i++){
			initTab(this,this.children[i],updateConf);
		}
	});
	$('#tabs-custom-team').each(function(){
		for(var i=1;i<this.children.length;i++){
			initTab(this,this.children[i],updateTeam);
		}
	});
	$('#force-start').on('click',function(){
		ready_state^=1;
		socket.emit('change_ready',{ready:ready_state});
	});
	function changeUsername(){
		var tmp=$('#username-input').val();
		if(tmp=='')tmp='Anonymous';
		socket.emit('change_nickname',{nickname:tmp});
		if(typeof(localStorage)!="undefined"){
			localStorage.username=tmp;
		}
	}
	$('#username-input').on('change',changeUsername);
	$('#username-input').on('input',changeUsername);
	$('#custom-map').on('change',updateConf);
	$('#custom-map').on('input',updateConf);
});

var chatStr='';

function checkChat(){
	var tmp=$('#chatroom-input').val(),res;
	if(is_team){
		if(tmp.substr(0,7)=='[team] '){
			res=tmp.substr(7);
		}else{
			res=chatStr;
		}
	}else{
		if(tmp.substr(0,7)=='[team] '){
			res=tmp.substr(7);
		}else{
			res=tmp;
		}
	}
	chatStr=res;
	$('#chatroom-input').val((is_team?'[team] ':'')+res);
}

$(document).ready(function(){
	var shown=true;
	$('#chat-messages-container').on('click',function(){
		$('#chat-messages-container').attr('class',shown?'minimized':'');
		$('#chatroom-input').attr('class',shown?'minimized':'');
		shown=!shown;
	});
	socket.on('chat_message',function(data){
		var th='';
		if(data.color){
			th='<span class="inline-color-block c'+data.color+'"></span><span class="username">'+htmlescape(data.sender)+'</span>: '+htmlescape(data.text)+'</p>';
			if(data.team){
				th='<span style="font-family:Quicksand-Bold">[team] </span>'+th;
			}
			th='<p class="chat-message">'+th;
		}else{
			th='<p class="chat-message server-chat-message">'+htmlescape(data.text)+'</p>'
		}
		$('#chat-messages-container')[0].innerHTML+=th;
		$('#chat-messages-container').scrollTop(233333);
	});
	$('#chatroom-input').on('keypress',function(data){
		if(data.keyCode==13){
			console.log('b');
			socket.emit('send_message',{text:chatStr,team:is_team});
			chatStr='',is_team=false;
			$('#chatroom-input').val('');
		}
	});
	$('#chatroom-input').focus(function(){
		chat_focus=true;
	});
	$('#chatroom-input').blur(function(){
		chat_focus=false;
		is_team=false;
		checkChat();
	});
	$('#chatroom-input').on('change',checkChat);
	$('#chatroom-input').on('input',checkChat);
	$($('#status-alert').children()[0].children[2]).on('click',function(e){
		$('#status-alert').css('display','none');
	});
	$($('#status-alert').children()[0].children[4]).on('click',function(e){
		socket.emit('leave');
		setTimeout(function(){
			var data=getConf();
			if(typeof(localStorage)!="undefined"){
				if(typeof(localStorage.username)=="undefined"){
					localStorage.username='Anonymous';
				}
				nickname=localStorage.username;
			}else{
				nickname='Anonymous';
			}
			socket.emit('join_game_room',{'room':room_id,'nickname':nickname});
			socket.emit('change_game_conf',data);
			$('#menu').css('display','');
			$('#game').css('display','none');
			$('#game-leaderboard').css('display','none');
			$('#turn-counter').css('display','none');
			$('#chat-messages-container').html('');
			$('#status-alert').css('display','none');
			ready_state=0;
			in_game=false;
		},1000);
	});
});