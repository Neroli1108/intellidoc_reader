//! Tauri IPC command handlers
//!
//! This module contains all the command handlers that are exposed to the frontend
//! through Tauri's IPC mechanism.

pub mod document;
pub mod annotation;
pub mod llm;
pub mod editor;
pub mod voice;