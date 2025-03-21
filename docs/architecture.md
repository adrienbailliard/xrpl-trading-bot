# 📂 Project Architecture

This document explains the roles of the different classes in the XRPL Trading Bot.

## Entry Point

`index.ts`

This is the entry point of the XRPL Trading Bot.
it: + Initializes all core components
+ Listens for network events
+ Processes transactions both before and after they are validated
