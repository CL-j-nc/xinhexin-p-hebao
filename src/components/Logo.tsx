import React from 'react';
import { motion } from 'framer-motion';

const Logo: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="h-6 w-6 bg-emerald-600 text-white flex items-center justify-center font-bold text-xs rounded"
        >
            SH
        </motion.div>
    );
};

export default Logo;
