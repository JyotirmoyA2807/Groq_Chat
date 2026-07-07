"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { UIMessage } from "ai";
import { SavedChat, chatHistoryManager } from "@/lib/chat-history";

const CHAT_SAVE_DEBOUNCE_MS = 2000; // 2 seconds debounce

export interface UseChatHistoryReturn {
  // State
  chats: SavedChat[];
  currentChatId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  saveCurrentChat: (
    messages: UIMessage[],
    model: string,
    title?: string
  ) => Promise<SavedChat | null>;
  loadChat: (chatId: string) => SavedChat | null;
  deleteChat: (chatId: string) => Promise<boolean>;
  clearAllChats: () => Promise<boolean>;
  setCurrentChatId: (chatId: string | null) => void;

  // Auto-save functionality
  enableAutoSave: (
    messages: UIMessage[],
    model: string,
    onSaveSuccess?: (chat: SavedChat) => void
  ) => void;
  disableAutoSave: () => void;
}

export function useChatHistory(): UseChatHistoryReturn {
  const [chats, setChats] = useState<SavedChat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-save refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoSaveRef = useRef<{
    messages: UIMessage[];
    model: string;
    chatId: string | null; // Track the chat ID that was last successfully saved
  } | null>(null);

  // Load chats from localStorage on mount
  useEffect(() => {
    const loadChats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const loadedChats = chatHistoryManager.getAllChats();
        setChats(loadedChats);
      } catch (err) {
        console.error("Failed to load chat history:", err);
        setError("Failed to load chat history");
      } finally {
        setIsLoading(false);
      }
    };

    loadChats();
  }, []);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Save current chat
  const saveCurrentChat = useCallback(
    async (messages: UIMessage[], model: string): Promise<SavedChat | null> => {
      try {
        setError(null);

        // Don't save empty chats
        if (!messages || messages.length === 0) {
          return null;
        }

        let savedChat: SavedChat | null = null;

        if (currentChatId) {
          // Update existing chat
          const success = chatHistoryManager.updateChat(currentChatId, {
            messages,
            model,
          });

          if (success) {
            savedChat = chatHistoryManager.getChatById(currentChatId);
          }
        } else {
          // Save as new chat
          savedChat = chatHistoryManager.saveChat({
            messages,
            model,
          });

          if (savedChat) {
            setCurrentChatId(savedChat.id);
          }
        }

        if (savedChat) {
          // Refresh the chats list
          const updatedChats = chatHistoryManager.getAllChats();
          setChats(updatedChats);
          return savedChat;
        } else {
          setError("Failed to save chat");
          return null;
        }
      } catch (err) {
        console.error("Failed to save chat:", err);
        setError("Failed to save chat");
        return null;
      }
    },
    [currentChatId, setChats, setCurrentChatId, setError] // Added dependencies for completeness
  );

  // Load a specific chat
  const loadChat = useCallback((chatId: string): SavedChat | null => {
    try {
      setError(null);
      const chat = chatHistoryManager.getChatById(chatId);

      if (chat) {
        setCurrentChatId(chatId);
        return chat;
      } else {
        setError("Chat not found");
        return null;
      }
    } catch (err) {
      console.error("Failed to load chat:", err);
      setError("Failed to load chat");
      return null;
    }
  }, []);

  // Delete a chat
  const deleteChat = useCallback(
    async (chatId: string): Promise<boolean> => {
      try {
        setError(null);
        const success = chatHistoryManager.deleteChat(chatId);

        if (success) {
          // If we're currently viewing the deleted chat, clear the current chat ID
          if (currentChatId === chatId) {
            setCurrentChatId(null);
          }

          // Refresh the chats list
          const updatedChats = chatHistoryManager.getAllChats();
          setChats(updatedChats);
          return true;
        } else {
          setError("Failed to delete chat");
          return false;
        }
      } catch (err) {
        console.error("Failed to delete chat:", err);
        setError("Failed to delete chat");
        return false;
      }
    },
    [currentChatId, setChats, setCurrentChatId, setError] // Added dependencies
  );

  // Clear all chats
  const clearAllChats = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const success = chatHistoryManager.clearAllChats();

      if (success) {
        setChats([]);
        setCurrentChatId(null);
        return true;
      } else {
        setError("Failed to clear chat history");
        return false;
      }
    } catch (err) {
      console.error("Failed to clear chat history:", err);
      setError("Failed to clear chat history");
      return false;
    }
  }, [setChats, setCurrentChatId, setError]); // Added dependencies

  // Auto-save functionality
  const enableAutoSave = useCallback(
    (
      messages: UIMessage[],
      model: string,
      onSaveSuccess?: (chat: SavedChat) => void
    ) => {
      // Don't auto-save if no messages
      if (!messages || messages.length === 0) {
        return;
      }

      // Check if messages or chat context have actually changed since the last *successful* save
      const lastSave = lastAutoSaveRef.current;
      const hasChanged =
        !lastSave ||
        lastSave.model !== model ||
        lastSave.chatId !== currentChatId || // Compare with currentChatId to detect new/switched chats
        JSON.stringify(lastSave.messages) !== JSON.stringify(messages);

      if (!hasChanged) {
        return; // No change, no need to save
      }

      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Debounce auto-save
      autoSaveTimeoutRef.current = setTimeout(async () => {
        const savedChat = await saveCurrentChat(messages, model);
        if (savedChat) {
          lastAutoSaveRef.current = {
            messages: [...messages],
            model,
            chatId: savedChat.id,
          };
          onSaveSuccess?.(savedChat);
        } else {
          console.error("Auto-save failed.");
          // Optionally, trigger an error notification here if onSaveSuccess is not meant for errors
        }
      }, CHAT_SAVE_DEBOUNCE_MS);
    },
    [saveCurrentChat, currentChatId] // saveCurrentChat is a dependency, currentChatId is used for comparison
  );

  const disableAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    lastAutoSaveRef.current = null; // Clear last saved state when auto-save is disabled
  }, []);

  return {
    // State
    chats,
    currentChatId,
    isLoading,
    error,

    // Actions
    saveCurrentChat,
    loadChat,
    deleteChat,
    clearAllChats,
    setCurrentChatId,

    // Auto-save
    enableAutoSave,
    disableAutoSave,
  };
}
