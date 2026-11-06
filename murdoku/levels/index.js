/* The rooms of the house, one file each. Add a room by dropping a file next to
   this one and importing it here; nothing else in the engine changes.

   A room is data only: { id, title, size, window, rooms, furniture, people,
   solution }. The rulebook (MURDOKU-RULEBOOK.md) explains every field. The
   first room in the list is the one the start card opens by default. */
import garden from './garden.js';
import country from './country.js';
import restaurant from './restaurant.js';
import ruins from './ruins.js';

export const LEVELS = [garden, country, restaurant, ruins];
