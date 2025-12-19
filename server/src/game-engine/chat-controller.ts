import type { TypedServer, TypedSocket } from '../sockets/index.js';

export type ChatType = 'turn' | 'discussion' | 'all';

/**
 * Centralized chat control system
 * Manages who can send messages and when
 */
export class ChatController {
    private roomId: string;
    private io: TypedServer;
    private lockedChats: Set<ChatType> = new Set(['turn', 'discussion']);
    private allowedTurnPlayer: string | null = null;

    constructor(roomId: string, io: TypedServer) {
        this.roomId = roomId;
        this.io = io;
    }

    /**
     * Enable turn-based chat for specific player
     */
    enableTurnChat(playerId: string) {
        this.lockedChats.delete('turn');
        this.allowedTurnPlayer = playerId;

        this.io.to(this.roomId).emit('impostor:chat-unlocked', {
            chatType: 'turn',
            allowedPlayer: playerId
        });

        console.log(`✅ Turn chat enabled for player: ${playerId}`);
    }

    /**
     * Disable turn-based chat
     */
    disableTurnChat() {
        this.lockedChats.add('turn');
        this.allowedTurnPlayer = null;

        this.io.to(this.roomId).emit('impostor:chat-locked', {
            chatType: 'turn'
        });

        console.log(`🔒 Turn chat disabled`);
    }

    /**
     * Enable discussion chat for all players
     */
    enableDiscussionChat() {
        this.lockedChats.delete('discussion');

        this.io.to(this.roomId).emit('impostor:chat-unlocked', {
            chatType: 'discussion'
        });

        console.log(`✅ Discussion chat enabled`);
    }

    /**
     * Disable discussion chat
     */
    disableDiscussionChat() {
        this.lockedChats.add('discussion');

        this.io.to(this.roomId).emit('impostor:chat-locked', {
            chatType: 'discussion'
        });

        console.log(`🔒 Discussion chat disabled`);
    }

    /**
     * Lock all chats
     */
    lockAllChats() {
        this.lockedChats.add('turn');
        this.lockedChats.add('discussion');
        this.allowedTurnPlayer = null;

        this.io.to(this.roomId).emit('impostor:chat-locked', {
            chatType: 'all'
        });

        console.log(`🔒 All chats locked`);
    }

    /**
     * Check if player can send a clue (turn chat)
     */
    canSendClue(playerId: string): boolean {
        return !this.lockedChats.has('turn') && this.allowedTurnPlayer === playerId;
    }

    /**
     * Check if player can send discussion message
     */
    canSendDiscussionMessage(playerId: string): boolean {
        return !this.lockedChats.has('discussion');
    }

    /**
     * Get current chat status
     */
    getStatus() {
        return {
            turnChatLocked: this.lockedChats.has('turn'),
            discussionChatLocked: this.lockedChats.has('discussion'),
            allowedTurnPlayer: this.allowedTurnPlayer,
        };
    }
}
