# Prompts used

I've used Github Copilot starting in Ask and ending with Agent mode. I mixed Claude Sonnet and GTP-4

Do you know what is a 3D shooter game? If yes, tell me some 3D shooter games

I want to create a 3D shooter game with web technologies that works locally (no server needed). What stack would you recommend?

Lets add basic movement controls using keyboard arrows to move through 3d space

Add diagonal movement and mouse look controls

Add gravity control so that: if I look up and move forward camera doesn't go up, just foward or backward. If I look down and mover foward or backward, camera doesn't go down, just foward or backward.

Now let's add ground an horizon effect with some assets. Create a jungle-like landscape.

Add much more trees. They must be higher and more detailed even with different types of trees.

Add a shoot feature so when users clicks with left mouse button a bullet is shooted. The bullet trajectory should be shown as a lighting effect

Add a weapon show in POV and a crosshair used to point before shoot

Weapon doesn't appear in the screen

Lets add enemies. Put one enemy in front of the player

Delay the appearance of enemies 10 seconds from the start of the game and show a countdown


When an enemy reaches the player position the game is over, blackout the screen and show a "Game Over" message with a "retry" button that just relkoads the web page to start over
make enemies move by jumping

Could you refactor this code into smaller files for better handling

change the spawn distance of enemies to be random

add collision detection with trees for player and enemies

doens't work. Player and enemies are able to go through a tree. That shouldn't happen

add a score system where every enenmy shooted down makes the player earn 1 point. A scoreboard must be shown at the top right corner of the screen

make every enemy to move with different speed and jumpt with different frequency

add an animation when an enemy is shooted

the scoreboard doesn't increments when a enemi is shooted down

increase the minimum enemy speed on each round by 0.02

add a camera bob effect for more realistic walking

increase the up and down movement range of the bob effect

add a recoil effect on the camera when shooting

add a radar that show enemies near the player

add ground textures (grass, dirt paths)

change the number of enemies on each round. Start with 1 and increase each round by 1

add #file:ambient.mp3 as ambient sound

add #file:mud.jpg as enemies body texture

add sound effects for shooting using #file:shoot.mp3

add a sound when new enemies are shooted using #file:boom.mp3

add texture to trees using #file:trunk.jpg for the trunk and #file:leafs.jpg for the leafs

add documentation on how to set tup de project and run it