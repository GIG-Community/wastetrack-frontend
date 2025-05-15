// src/pages/auth/ResetPassword.jsx
import { Link } from "react-router-dom";

const ResetPassword = () => {
    return (
        <div className="reset-password-success">
            <h1>Reset Password Berhasil</h1>
            <p>
                Password Anda telah berhasil diubah.
                Anda sekarang dapat login dengan password baru Anda.
            </p>
            <Link to="/login" className="login-button">
                Login Sekarang
            </Link>
        </div>
    );
};

export default ResetPassword;