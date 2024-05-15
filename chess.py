from flask import (
    Blueprint, flash, g, redirect, render_template, request, url_for, session
)
from werkzeug.exceptions import abort
from flask_socketio import SocketIO, join_room, leave_room, send, emit
from . import socketio, games
from .auth import login_required
from .db import get_db

bp = Blueprint('chess', __name__)
@bp.route('/', methods=('GET', 'POST'))
@login_required
def index():
    return render_template('/index.html')


@bp.route('/')
@login_required
def multiplayer():
    return render_template('/index.html')

'''@socketio.on('message')
def handle_message(data):
    print('received message: ', session['username'])'''

# Room joining logic for games
@socketio.on('join_game')
def handle_join_game(data):
    user_id = session.get('user_id')
    if not user_id:
        return "User not authenticated"

    room = data.get('room')
    matches = []
    create = 0

    # Looks to join available room if none specified, or if there are no open rooms, it creates a new randomly named one
    if not room:
        # Look for currently open rooms to join and store
        matches = [game for game in games if len(game['room']['players'] < 2)]

        # If no available matches create a new room
        if len(matches) == 0:
            from random import choice
            from string import ascii_uppercase
            room = ''.join(choice(ascii_uppercase) for i in range(10))
            matches.append({'room': room, 'players': []})
            create = 1
    else:
        # Check if the specified room already exists, else create a room
        matches = [game for game in games if game['room'] == room]
        if len(matches) == 0:
            matches.append({'room': room, 'players': []})
            create = 1

    print(matches)

    game = matches[0]
    if create == 1:
        games.append(game)

    # Else check if room is already full
    if len(game['players']) == 2:
        emit('player_joined' "Game is already full, please try join another room")

    # Else if room add the user to the existing game
    else:
        join_room(game['room'])
        # If already in game, notify the player and add to list
        if user_id in game['players']:
            emit('player_joined', f"You are already in the game '{ room }'")
        else:
            game['players'].append(user_id)
            emit('player_joined', "You joined the game '{}'".format(room))

        emit('player_joined', game, room=game['room'])
    print(game)