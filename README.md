# multiplayer-pong-distributed-system

## Project on Operating/ Distributed Systems
## By: Anup Shakya

### Implementations
1. Implements distributed architecture for hosting a game
2. Handles a single point of failure by handing-off clients between servers
3. Implements a load balancing layer that dispatches client load between servers
4. Makes more processing resource accessible to users.

### Libraries and resources Used:
- NodeJS
- Primus 7.3.5 for creating and maintaining WebSockets.
- Primus Rooms (primus-rooms:3.4.1) for managing multi-player game rooms.
- Express 4.17.1
- HAProxy for balancing load between servers
- Democracy 3.1.3 for broadcasting messages among servers (i.e., server to server communication)
- Primus Redis Rooms for managing game rooms across multiple servers.

