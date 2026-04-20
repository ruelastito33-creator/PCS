"use client";

import { useState, useTransition } from "react";
import type { Profile, Role } from "@prisma/client";
import { useDialogs } from "@/components/shared/dialog-provider";
import { ROLE_LABELS } from "@/lib/constants";
import {
  cambiarRolUsuario,
  crearUsuarioSistema,
  enviarResetPassword,
  toggleUsuarioActivo,
} from "@/lib/actions/usuarios";

type Props = {
  usuarios: Profile[];
};

const ROLE_OPTIONS: Role[] = [
  "OPERACIONES",
  "COCINA",
  "CHOFER",
  "SURTIDOR_AGUAS",
  "HIELERA",
  "INSUMOS",
];

export function UsuariosAdmin({ usuarios }: Props) {
  const { alert: showAlert, confirm: askConfirm } = useDialogs();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("OPERACIONES");

  const activos = usuarios.filter((u) => u.is_active).length;

  function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await crearUsuarioSistema({
        email,
        password,
        fullName,
        role,
      });

      if (!res.success) {
        await showAlert({
          title: "No se pudo crear usuario",
          message: res.error,
          variant: "error",
        });
        return;
      }

      setEmail("");
      setPassword("");
      setFullName("");
      setRole("OPERACIONES");
      await showAlert({
        title: "Usuario creado",
        message: "El usuario ya puede iniciar sesion con su email y contrasena.",
        variant: "success",
      });
    });
  }

  function onCambiarRol(profileId: string, nextRole: Role) {
    startTransition(async () => {
      const res = await cambiarRolUsuario(profileId, nextRole);
      if (!res.success) {
        await showAlert({
          title: "No se pudo actualizar rol",
          message: res.error,
          variant: "error",
        });
      }
    });
  }

  function onToggleActivo(user: Profile) {
    startTransition(async () => {
      const ok = await askConfirm({
        title: user.is_active ? "Desactivar usuario" : "Activar usuario",
        message: user.is_active
          ? `Se desactivara ${user.email}. Podra autenticarse, pero no entrar a la app.`
          : `Se activara ${user.email}.`,
        confirmLabel: user.is_active ? "Desactivar" : "Activar",
        tone: user.is_active ? "danger" : "primary",
      });
      if (!ok) return;

      const res = await toggleUsuarioActivo(user.id);
      if (!res.success) {
        await showAlert({
          title: "No se pudo actualizar estado",
          message: res.error,
          variant: "error",
        });
      }
    });
  }

  function onResetPassword(user: Profile) {
    startTransition(async () => {
      const ok = await askConfirm({
        title: "Enviar reset de contrasena",
        message: `Se enviara un correo de reset a ${user.email}.`,
        confirmLabel: "Enviar",
      });
      if (!ok) return;

      const res = await enviarResetPassword(user.email);
      if (!res.success) {
        await showAlert({
          title: "No se pudo enviar reset",
          message: res.error,
          variant: "error",
        });
        return;
      }
      await showAlert({
        title: "Reset enviado",
        message: `Se envio correo de reset a ${user.email}.`,
        variant: "success",
      });
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        <h4 className="text-sm font-semibold text-text-primary">Crear usuario</h4>
        <form onSubmit={handleCrear} className="mt-3 grid gap-3 md:grid-cols-4">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nombre completo"
            className="rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-ghost focus:border-orange-400 focus:outline-none"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@dominio.com"
            type="email"
            className="rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-ghost focus:border-orange-400 focus:outline-none"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contrasena temporal"
            type="password"
            className="rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-ghost focus:border-orange-400 focus:outline-none"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-text-primary focus:border-orange-400 focus:outline-none"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="md:col-span-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
          >
            {isPending ? "Procesando..." : "Crear usuario"}
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border bg-surface-alt px-4 py-2.5">
          <span className="text-xs text-text-muted">
            <span className="font-semibold text-text-primary">{activos}</span> activos
            {" · "}
            <span className="font-semibold text-text-primary">{usuarios.length}</span> total
          </span>
          <span className="text-xs text-text-faint">
            Administra roles, estado y reset de contrasena
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-alt">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-text-muted">
                  Nombre
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-text-muted">
                  Email
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-text-muted">
                  Rol
                </th>
                <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-text-muted">
                  Estado
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-text-muted">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-hover-surface">
                  <td className="px-4 py-2 text-sm font-medium text-text-primary">
                    {u.full_name}
                  </td>
                  <td className="px-4 py-2 text-sm text-text-muted">{u.email}</td>
                  <td className="px-4 py-2">
                    <select
                      value={u.role}
                      disabled={isPending}
                      onChange={(e) => onCambiarRol(u.id, e.target.value as Role)}
                      className="rounded-md border border-input-border bg-input-bg px-2 py-1 text-xs text-text-primary focus:border-orange-400 focus:outline-none disabled:opacity-50"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                          : "bg-surface-muted text-text-faint"
                      }`}
                    >
                      {u.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => onResetPassword(u)}
                        className="rounded-md border border-border px-2 py-1 text-xs font-medium text-text-secondary hover:bg-hover-surface disabled:opacity-50"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => onToggleActivo(u)}
                        className={`rounded-md px-2 py-1 text-xs font-medium text-white disabled:opacity-50 ${
                          u.is_active ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {u.is_active ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
