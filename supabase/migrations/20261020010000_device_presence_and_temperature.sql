-- Fields the IoT team's MQTT messages carry (handshake and batch telemetry).
--
-- devices: what the handshake reports. last_seen is also set on every batch the
-- device appears in, so the dashboard can show "last seen 2 minutes ago".
alter table devices
  add column last_seen        timestamptz,
  add column firmware_version text,
  add column local_ip         text,
  add column wifi_rssi        integer,
  add column node_role        text check (node_role in ('root', 'child'));

-- telemetry: the AC temperatures sent next to each current reading. Optional,
-- because not every installation measures them.
alter table telemetry
  add column current_temperature double precision,
  add column target_temperature  double precision;
