import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleTheme, setTheme } from '../store/slices/uiSlice';

export const useTheme = () => {
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.ui.theme);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggle = () => dispatch(toggleTheme());
  const set = (newTheme) => dispatch(setTheme(newTheme));

  return { theme, toggle, set, isDark: theme === 'dark' };
};